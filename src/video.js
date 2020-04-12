export async function initWebCam() {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    // facingMode: "user",
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  })
  .then(function (stream) {
    // console.log('got video stream', stream);
    // nothing extra to do here
    return stream;
  })
  .catch(function (err) {
    /* handle the error */
    console.error('Failed to get local stream', err);
  });
}