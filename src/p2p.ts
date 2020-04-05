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

// keeps a map of peers
// const peers: { [key: string]: Peer.DataConnection } = {};
// (window as any)['_peers'] = peers;

const myId: string = getMyId();

console.log('my id is', myId);

export function init() {
  selfPeer = new Peer(myId);
  (window as any)['_selfPeer'] = selfPeer;

  selfPeer.on('error', err => {
    console.warn('selfPeer error', err);
  });

  selfPeer.on('open', () => {
    console.info('selfPeer open');
    subscribeToRegistryOrBecomeIt();
  });

  selfPeer.on('connection', conn => {
    console.log('selfPeer connection', conn.peer);
    conn.on('data', ({ type, payload }) => {
      console.log(`GOT[${conn.peer}]:`, type, payload)
      switch (type) {
        case 'hi':
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
    // while in development makes ID non-sticky
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
    console.warn('registryConn error', err);
  });

  registryConn.on('close', () => {
    console.warn('registryConn close');
    // TODO become a registry?
  })

  registryConn.on('data', (data: P2PMessage) => {
    console.log('registry says:', data);
    clearTimeout(regTimeout);
    if (data.type === 'peerlist') {
      const ids: string[] = data.payload.ids;
      ids.forEach(id => {
        // skip self
        if (id === selfPeer.id) return;
        const conn = selfPeer.connect(id, { reliable: true });

        conn.on('close', () => {
          console.log('peer close', id);
        })

        conn.on('open', () => {
          conn.send({ type: 'hi', payload: {} });
        });
      });
    }
  });
}

// become the registry for the service
export function becomeRegistry() {
  console.log('becomeRegistry !');
  const peers: any = {};

  const registry = new Peer(registryId);

  registry.on('open', () => {
    console.log('registry: open 🤖📝')
    subscribeToRegistryOrBecomeIt()
  });

  registry.on('error', err => {
    console.info('registry: error', err);
    // if (err.type === "unavailable-id") {
    // something happened.. on localhost multiple tabs a race condition is usual
    subscribeToRegistryOrBecomeIt();
  });

  registry.on('connection', conn => {
    const id = conn.peer;
    console.log('registry: connection', id);

    conn.on('open', () => {
      console.log('registry: conn open', id);
      if (!(id in peers)) {
        peers[id] = conn;
        // tell it about everyone else
        conn.send({
          type: 'peerlist',
          payload: { ids: Object.keys(peers) },
        })
      }
    });

    conn.on('error', (err) =>{
      console.log('registry: conn error', id, err);
      delete peers[id];
    });

    conn.on('close', () => {
      console.log('registry: conn close', id);
      delete peers[id];
    });
  })

  registry.on('disconnected', () => {
    console.log('registry: disconnected')
  });
}

