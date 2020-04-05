import Peer from 'peerjs';

const registryId = 'peer1-registry-aidcn1dckcwcSDCsdj2o3j';
const registryConnTimeout = 5 * 1000;

interface P2PMessage {
  type: string;
  payload: any; // it's always an object but attributes vary by `type`
}

// keep a list of all messages ever sent
const messages = [];

// ref to own instance connection
let selfPeer: Peer;

// string -> conn
const peers: any = {}

const myId: string = getMyId();

console.log('my id is', myId);

export function init() {
  selfPeer = new Peer(myId);
  selfPeer.on('error', err => {
    console.warn('selfPeer error', err);
  });
  selfPeer.on('open', () => {
    console.info('selfPeer open');
    subscribeToRegistryOrBecomeIt();
  });

  selfPeer.on('connection', conn => {
    conn.on('data', ({ type, payload }) => {
      switch (type) {
        case 'intro':
          console.log('got peer', conn.peer, conn.metadata);
          break;
        default:
          console.log('msg uknown', type, payload);
          break;
      }
    });
  });


}

function getMyId(): string {
  const randId = 'peer1' + Math.random().toString(36).substr(2);
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    // while in development makes it non-sticky
    return randId;
  } else {
    if (!localStorage.getItem('myid')) localStorage.setItem('myid', randId);
    return localStorage.getItem('myid') as string;
  }
}

// any new peer connecting gets a list of everyone who's online and tries to connect to them
//   also keeps a connection to the registry for heartbeat purposes
export function subscribeToRegistryOrBecomeIt() {
  console.log('connecting to registry..');

  // will make an instance of registry if cant connect in Xms
  const regTimeout = setTimeout(becomeRegistry, registryConnTimeout);

  const registryConn = selfPeer.connect(registryId, { reliable: true });

  registryConn.on('open', () => {
    console.log('registryConn open');
    registryConn.send({ type: 'register' });
  });
  registryConn.on('error', (err) => {
    console.warn('registry error', err);
    // TODO become a registry?
  });
  registryConn.on('data', (data: P2PMessage) => {
    console.log('registry says:', data);
    clearTimeout(regTimeout);
    if (data.type === 'peerlist') {
      const ids: string[] = data.payload.ids;
      ids.forEach(id => {
        // skip self
        if (id === selfPeer.id) return;
        peers[id] = selfPeer.connect(id, { reliable: true });
        peers[id].send({ type: 'hi', payload: {} });
      });
    }
  });
}

// become the registry for the service
export function becomeRegistry() {
  console.log('becomeRegistry !');
  const peers: any = {};

  const registry = new Peer(registryId);

  registry.on('error', err => {
    console.error('becomeRegistry', err);
    if (err.type === "unavailable-id") {
      // something happened.. a race condition perhaps?
      subscribeToRegistryOrBecomeIt();
    }
  });

  registry.on('connection', conn => {
    const id = conn.peer;
    console.log('peer connected', id);

    conn.on('close', removePeer.bind(null, id))
    conn.on('error', removePeer.bind(null, id))

    conn.on('open', () => {
      if (!(id in peers)) {
        peers[id] = conn;
        // tell it about everyone else
        conn.send({
          type: 'peerlist',
          payload: { ids: Object.keys(peers) },
        })
      }
    })
  })

  registry.on('disconnected', () => console.log('registry disconnected'));

  registry.on('open', id => {
    console.log('registry open', id)
    subscribeToRegistryOrBecomeIt()
  });

  function removePeer(id: string) {
    delete peers[id];
  }
}

