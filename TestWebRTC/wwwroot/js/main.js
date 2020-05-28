'use strict';

const constraints = {
    video: true,
};

const offerOptions = {
    offerToReceiveVideo: 1,
};

//تعریف متغییر های کلید ها و المان ها
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

callButton.disabled = true;
hangupButton.disabled = true;

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

//اجرای توابع در زمان کلیک
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

//=============================شروع================================
//تابع استارت
function startAction() {
    startButton.disabled = true;
    console.log("Local Stream - Start Action.")
    navigator.mediaDevices.getUserMedia(constraints).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    console.log("Local Stream - Start Action.")

    function gotLocalMediaStream(mediaStream) {
        localVideo.srcObject = mediaStream;
        localStream = mediaStream;
        console.log("Recive Local Stream.");
        callButton.disabled = false;
    }

    function handleLocalMediaStreamError(error) {
        console.log(`navigator.getUserMedia error: ${error.toString()}.`);
    }
}
//=============================پایان===============================

//=============================شروع================================
//توابع تماس
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    console.log('Starting call.');

    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
        console.log('video device : ' + videoTracks[0].label);
    } else {
        console.log('no video device.')
    }

    if (audioTracks.length > 0) {
        console.log('audio device : ' + audioTracks[0].label);
    } else {
        console.log('no audio device.')
    }

    const servers = null;

    localPeerConnection = new RTCPeerConnection(servers);
    console.log('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    console.log('Created remote peer connection object remotePeerConnection.');

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener(
        'iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    localPeerConnection.addStream(localStream);
    console.log('Added local stream to localPeerConnection.');

    console.log('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer).catch(setSessionDescriptionError);

    //============================================================================

    function handleConnection(event) {
        const peerConnection = event.target;
        const iceCandidate = event.candidate;

        if (iceCandidate) {
            const newIceCandidate = new RTCIceCandidate(iceCandidate);
            const otherPeer = getOtherPeer(peerConnection);

            otherPeer.addIceCandidate(newIceCandidate).then(() => {
                handleConnectionSuccess(peerConnection);
            }).catch((error) => {
                handleConnectionFailure(peerConnection, error);
            });

            console.log(getPeerName(peerConnection) + ' ICE candidate:\n' +
                event.candidate.candidate);
        }

        function getOtherPeer(peerConnection) {
            return (peerConnection === localPeerConnection) ?
                remotePeerConnection : localPeerConnection;
        }

        function handleConnectionSuccess(peerConnection) {
            console.log(getPeerName(peerConnection) + ' addIceCandidate success');
        }

        function handleConnectionFailure(peerConnection, error) {
            console.log(getPeerName(peerConnection) + ' failed to add ICE Candidate:\n' +
                error.toString());
        }
    }

    function getPeerName(peerConnection) {
        return (peerConnection === localPeerConnection) ?
            'localPeerConnection' : 'remotePeerConnection';
    }

    function handleConnectionChange(event) {
        const peerConnection = event.target;
        console.log('ICE state change event: ', event);
        console.log(getPeerName(peerConnection) + ' ICE state: ' +
            peerConnection.iceConnectionState);
    }

    function gotRemoteMediaStream(event) {
        const mediaStream = event.stream;
        remoteVideo.srcObject = mediaStream;
        remoteStream = mediaStream;
        console.log('Remote peer connection received remote stream.');
    }

    function setSessionDescriptionError(error) {
        console.log('Failed to create session description: ' + error.toString());
    }

    function createdOffer(description) {
        console.log('Offer from localPeerConnection:\n' + description.sdp);

        console.log('localPeerConnection setLocalDescription start.');
        localPeerConnection.setLocalDescription(description)
            .then(() => {
                setLocalDescriptionSuccess(localPeerConnection);
            }).catch(setSessionDescriptionError);

        console.log('remotePeerConnection setRemoteDescription start.');
        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
                setRemoteDescriptionSuccess(remotePeerConnection);
            }).catch(setSessionDescriptionError);

        console.log('remotePeerConnection createAnswer start.');
        remotePeerConnection.createAnswer()
            .then(createdAnswer)
            .catch(setSessionDescriptionError);

        function setLocalDescriptionSuccess(peerConnection) {
            setDescriptionSuccess(peerConnection, 'setLocalDescription');
        }

        function setRemoteDescriptionSuccess(peerConnection) {
            setDescriptionSuccess(peerConnection, 'setRemoteDescription');
        }

        function setDescriptionSuccess(peerConnection, functionName) {
            const peerName = getPeerName(peerConnection);
            console.log(peerName + ' ' + functionName + ' complete.');
        }

        function createdAnswer(description) {
            console.log('Answer from remotePeerConnection:\n' + description.sdp);

            console.log('remotePeerConnection setLocalDescription start.');
            remotePeerConnection.setLocalDescription(description)
                .then(() => {
                    setLocalDescriptionSuccess(remotePeerConnection);
                }).catch(setSessionDescriptionError);

            console.log('localPeerConnection setRemoteDescription start.');
            localPeerConnection.setRemoteDescription(description)
                .then(() => {
                    setRemoteDescriptionSuccess(localPeerConnection);
                }).catch(setSessionDescriptionError);
        }
    }
}
//=============================پایان===============================

//=============================شروع================================
//تابع قطع
function hangupAction() {
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    console.log('Ending call.');
}
//=============================پایان===============================