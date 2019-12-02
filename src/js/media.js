export default function record(type, outputContainer) {
    if (!navigator.mediaDevices) { // !undefined -> true
        // alert('...');
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not support media!';
        document.body.appendChild(alertEl);
        return;
    }

    const outputEl = document.createElement(type);
    outputContainer.appendChild(outputEl);

    if (!window.MediaRecorder) {
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not media recordering! Use Yande Browser.';
        document.body.appendChild(alertEl);
        return;
    }

    const recordOptions = {
        audio: true,
        video: type === 'video' ? true : false
    }

    navigator.mediaDevices.getUserMedia(recordOptions)
        .then(stream => {
            const mediaRecorder = new MediaRecorder(stream, {
                mediaType: `${type}/webm`, // MIME TYPE
            });

            const blobParts = []; // для хранения "кусков" записанного контента

            mediaRecorder.addEventListener('dataavailable', ev => {
                blobParts.push(ev.data);
            });

            mediaRecorder.addEventListener('stop', ev => {
                stream.getTracks().forEach(o => o.stop()); // останавливаем все треки
                const blob = new Blob(blobParts);
                outputEl.srcObject = null;

                const formData = new FormData();
                formData.append('media', blob);

                fetch('http://localhost:9999/upload', {
                    method: 'POST',
                    body: formData, // Content-Type: multipart/form-data выставится автоматически
                }).then(resp => {
                    if (!resp.ok) {
                        throw new Error(resp.statusText);
                    }
                    return resp.json();
                }).then(data => {
                    const url = `http://localhost:9999/static/${data.name}`;
                    const recordEl = document.createElement(type);
                    recordEl.src = url;
                    recordEl.controls = true;
                    outputContainer.appendChild(recordEl);
                }).catch(e => {
                    console.log(e);
                });
            });

            mediaRecorder.start();
            outputEl.srcObject = stream;
            outputEl.muted = true;
            outputEl.play();

            setTimeout(() => {
                mediaRecorder.stop();
            }, 5000);

        }).catch(e => {
            console.log(e.message);
        });
}
