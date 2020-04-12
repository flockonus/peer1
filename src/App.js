import React from 'react';
import './App.css';
import * as P2P from "./p2p";
import { initWebCam } from "./video";

class App extends React.Component {
  constructor(props) {
    super(props);
    const urlParams = new URLSearchParams(window.location.search);
    this.state = {
      selfStream: null,
      roomId: urlParams.get('room') || 'default00000',
      peers: {},
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
      },
        () => setTimeout(this.initNetwork.bind(this), Math.random() * 1000)
      );
    } catch (err) {
      // TODO make a fatal message here
      console.error(err);
    }
  }

  async initNetwork() {
    P2P.subscribe((p2pState) => {
      console.log('p2pState', p2pState);
      this.setState({
        peers: p2pState.peers,
      });
    });
    await P2P.init(this.state.roomId, this.state.selfStream);
  }

  renderPeerVideos(peers) {
    const videos = [];
    for (const key in peers) {
      const videoEl = <video key={`key-${key}`} id={key}></video>;
      videos.push(videoEl);
    }
    return videos;
  }

  // after each render, try to link the video stream to the video element
  componentDidUpdate() {
    for (const key in this.state.peers) {
      const videoEl = document.getElementById(key);
      if (!videoEl.srcObject) {
        videoEl.srcObject = this.state.peers[key];
        videoEl.onloadedmetadata = function(event) {
          videoEl.play();
        };
        videoEl.volume = 0;
      }
      console.log(videoEl);
    }
  }

  render() {
    
    return (
      <div className="App">
        <header className="App-header">
          <div>HEADER</div>
          <div>OHAYOOOOO</div>
          <video className="video-self">Acquiring stream</video>
        </header>
        <div className="stage">
          {this.renderPeerVideos(this.state.peers)}
        </div>
      </div>
    );
  }
}

export default App;
