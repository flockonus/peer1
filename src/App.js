import React from 'react';
import './App.css';
import * as P2P from "./p2p";
import { initWebCam } from "./video";


class App extends React.Component {
  constructor(props) {
    var urlParams = new URLSearchParams(window.location.search);
    super(props);
    this.state = {
      selfStream: null,
      roomId: urlParams.get('room') || 'default00000',
    };
    this.initCam();
  }

  async initCam() {
    try {
      const stream = await initWebCam();
      if (!stream || !stream.active) {
        throw new Error('missing stream');
      }
      var video = document.querySelector('.video-self');
      video.volume = 0;
      video.srcObject = stream;
      video.onloadedmetadata = function(event) {
        video.play();
      };
      this.setState(state => {
        return { selfStream: stream }
      }
      /*, () => setTimeout(this.initNetwork.bind(this), Math.random() * 1000)
      */
      );
    } catch (err) {
      // TODO make a fatal message here
      console.error(err);
    }
  }

  async initNetwork() {
    await P2P.init(this.status.roomId, this.state.selfStream);
    P2P.subscribe((p2pState) => {
      console.log('p2pState', p2pState);
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div>HEADER</div>
          <div>_</div>
          <video className="video-self">Acquiring stream</video>
        </header>
      </div>
    );
  }
}

export default App;
