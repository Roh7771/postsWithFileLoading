const baseUrl = 'https://posts-on-express.herokuapp.com';
// const baseUrl = 'http://localhost:9999';
let freshestPostId = 0;
let lastSeenPostId = 0;

const rootEl = document.getElementById('root');

const formEl = document.createElement('form');
formEl.enctype = "multipart/form-data";
formEl.innerHTML = `
    <div class="form-group mt-2">
        <input required placeholder="Введите текст" class="form-control" data-type="text">
    </div>
    <div class="form-group output d-flex justify-content-center">
    </div>
    <div class="form-group d-flex justify-content-center" data-type="btnsCntr">
        <button class="btn btn-primary mr-2" data-type="audio">Добавить аудиозапись</button>
        <button class="btn btn-primary mr-2" data-type="video">Добавить видеозапись</button>
        <label class="mb-0" for="image">
            <div class="btn btn-primary cursor-pointer" data-type="image">Добавить картинку</div>
        </label>
        <input type="file" id='image' name="image">
    </div>
    <button type="submit" class="btn btn-primary mx-auto d-block" data-type="button">Опубликовать</button>
`;

let newPostData = {
    type: 'Обычный'
}

const closeEl = document.createElement('span');
closeEl.classList.add('close');
closeEl.addEventListener('click', fullReset);

const outputContainer = formEl.querySelector('.output');

const audioButtonEl = formEl.querySelector('[data-type=audio]');
const videoButtonEl = formEl.querySelector('[data-type=video]');
const imageButtonEl = formEl.querySelector('[data-type=image]');
const inputImageEl = formEl.querySelector('input[name=image]')
const addNewPostButtonEl = formEl.querySelector('[data-type=button]');
const buttonsArray = [addNewPostButtonEl, imageButtonEl, videoButtonEl, audioButtonEl];
const buttonsContainerEl = formEl.querySelector('[data-type=btnsCntr]');

buttonsContainerEl.addEventListener('click', e => {
    if (e.target.dataset.type === 'audio' || e.target.dataset.type === 'video') {
        e.preventDefault();
        record(e.target.dataset.type, e.target);
        newPostData.type = e.target.dataset.type;
    }
})

inputImageEl.addEventListener('change', ev => {
    ev.preventDefault();
    lockButtons();
    newPostData.type = 'Картинка';
    imageButtonEl.innerHTML = 'Идет загрузка...'
    const [first] = Array.from(ev.currentTarget.files);
    const formData = new FormData();
    formData.append('media', first);
    fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
    }).then(resp => {
        if (!resp.ok) {
            throw new Error(resp.statusText);
        }
        return resp.json();
    }).then(data => {
        const imageUrl = `${baseUrl}/static/${data.name}`;
        newPostData.url = imageUrl;
        const imageEl = document.createElement('img');
        imageEl.src = imageUrl;
        outputContainer.appendChild(imageEl);
        imageButtonEl.innerHTML = 'Загрузка завершена';
        outputContainer.appendChild(closeEl);
    }).catch(e => {
        console.log(e);
    }).finally(() => {
        addNewPostButtonEl.disabled = false;
    });
    ev.currentTarget.value = '';
});

formEl.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
        ...newPostData,
        text: textEl.value,
    };
    fetch(`${baseUrl}/posts`, {
        body: JSON.stringify(data),
        headers: { "Content-Type": 'application/json' },
        method: 'POST'
    }).then(
        response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }
    ).then(
        data => {
            textEl.value = '';
            localStorage.clear();
            fullReset();
            freshPostsRender(data);
        }
    ).catch(error => {
        console.log(error);
    });
})

const textEl = formEl.querySelector('[data-type=text]');
textEl.value = localStorage.getItem('text');
textEl.addEventListener('input', e => {
    localStorage.setItem('text', e.currentTarget.value);
})

rootEl.appendChild(formEl);

const addFreshPostsButtonEl = document.createElement('button');
addFreshPostsButtonEl.className = 'btn btn-primary mx-auto mt-2 mb-2 d-none';
addFreshPostsButtonEl.innerHTML = 'Свежие посты!';
addFreshPostsButtonEl.addEventListener('click', () => {
    addFreshPostsButtonEl.classList.remove('d-block');
    addFreshPostsButtonEl.classList.add('d-none');
    addFreshPosts();
});
rootEl.appendChild(addFreshPostsButtonEl);

const postsEl = document.createElement('div');
rootEl.appendChild(postsEl);

const addOldPostsButtonEl = document.createElement('button');
addOldPostsButtonEl.className = 'btn btn-primary d-block mx-auto mt-2';
addOldPostsButtonEl.innerHTML = 'Показать еще посты';
addOldPostsButtonEl.addEventListener('click', addOldPosts)
rootEl.appendChild(addOldPostsButtonEl);

function addOldPosts() {
    fetch(`${baseUrl}/posts/get-old-posts/${lastSeenPostId}`)
        .then(
            response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }
        ).then(
            data => {
                oldPostsRender(data);
            }
        ).catch(error => {
            console.log(error);
        });
}

function addFreshPosts() {
    fetch(`${baseUrl}/posts/get-fresh-posts/${freshestPostId}`)
        .then(
            response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }
        ).then(
            data => {
                freshPostsRender(data);
            }
        ).catch(error => {
            console.log(error);
        });
}

function oldPostsRender(data) {
    data.sort(function (a, b) {
        return b.id - a.id
    });

    if (data.length < 5) {
        addOldPostsButtonEl.classList.add('d-none');
        addOldPostsButtonEl.classList.remove('d-block');
        if (data.length === 0) {
            return;
        }
    } else {
        fetch(`${baseUrl}/posts/old-posts-check/${data[data.length - 1].id}`)
            .then(
                response => {
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    return response.text();
                },
            ).then(
                data => {
                    if (data === 'true') {
                        addOldPostsButtonEl.classList.add('d-none');
                        addOldPostsButtonEl.classList.remove('d-block');
                    };
                }
            ).catch(error => {
                console.log(error);
            })
    }

    if (freshestPostId === 0) {
        freshestPostId = data[0].id;
    }
    lastSeenPostId = data[data.length - 1].id;

    for (const item of data) {
        postsEl.appendChild(createPost(item));
    }
}

function freshPostsRender(data) {
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return;
        }
        data.sort(function (a, b) {
            return b.id - a.id
        });
        freshestPostId = data[0].id;
        for (const item of data) {
            postsEl.insertBefore(createPost(item), postsEl.children[0]);
        }
    } else {
        freshestPostId = data.id;
        postsEl.insertBefore(createPost(data), postsEl.children[0]);
    }
}

function createPost(item) {
    const newPostEl = document.createElement('div');
    newPostEl.className = 'card mt-3';

    if (item.type === 'Обычный') {
        newPostEl.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <p class="card-text">${item.text}</p>
                    <button data-action="like" class="btn btn-primary mr-2">❤ ${item.likes}</button>
                    <button data-action="dislike" class="btn btn-primary mr-2">👎</button>
                    <button data-action="delete" class="btn btn-primary">Удалить пост</button>
                </div>
            </div>
       `;
    } else if (item.type === 'Картинка') {
        newPostEl.innerHTML = `
            <div class="card">
                <img src="${item.url}" class="card-img-top">
                <div class="card-body">
                    <p class="card-text">${item.text}</p>
                    <button data-action="like" class="btn btn-primary mr-2">❤ ${item.likes}</button>
                    <button data-action="dislike" class="btn btn-primary mr-2">👎</button>
                    <button data-action="delete" class="btn btn-primary">Удалить пост</button>
                </div>
            </div>
       `;
    } else if (item.type === 'Видео') {
        newPostEl.innerHTML = `
            <div class="card">
                <div class="card-img-top embed-responsive embed-responsive-16by9">
                    <video src="${item.url}" controls=""></video>
                </div>
                <div class="card-body">
                    <p class="card-text">${item.text}</p>
                    <button data-action="like" class="btn btn-primary mr-2">❤ ${item.likes}</button>
                    <button data-action="dislike" class="btn btn-primary mr-2">👎</button>
                    <button data-action="delete" class="btn btn-primary">Удалить пост</button>
                </div>
            </div>
       `;
    } else if (item.type === 'Аудио') {
        newPostEl.innerHTML = `
            <div class="card">
                <audio controls="" class="card-img-top" src="${item.url}"></audio>
                <div class="card-body">
                <p class="card-text">${item.text}</p>
                    <button data-action="like" class="btn btn-primary mr-2">❤ ${item.likes}</button>
                    <button data-action="dislike" class="btn btn-primary mr-2">👎</button>
                    <button data-action="delete" class="btn btn-primary">Удалить пост</button>
                </div>
            </div>
       `;
    }

    const likeButtonEl = newPostEl.querySelector('[data-action=like]');

    newPostEl.addEventListener('click', e => {
        if (e.target.dataset.action === 'like') {
            likesHandler('like', item.id, likeButtonEl);
        } else if (e.target.dataset.action === 'dislike') {
            likesHandler('dislike', item.id, likeButtonEl);
        } else if (e.target.dataset.action === 'delete') {
            fetch(`${baseUrl}/posts/${item.id}`, {
                method: 'DELETE'
            }).then(
                response => {
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                },
            ).catch(error => {
                console.log(error);
            });
            postsEl.removeChild(newPostEl);
        }
    });
    return newPostEl;
}

function likesHandler(type, id, button) {
    fetch(`${baseUrl}/posts/${type}/${id}`, {
        method: 'POST'
    }).then(
        response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.text();
        },
    ).then(
        data => {
            button.innerHTML = `❤ ${data}`;
        }
    ).catch(error => {
        console.log(error);
    })
}

function record(type, pressedButton) {
    if (!navigator.mediaDevices) { // !undefined -> true
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not support media!';
        document.body.appendChild(alertEl);
        return;
    }

    if (!window.MediaRecorder) {
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not media recordering! Use Yande Browser.';
        document.body.appendChild(alertEl);
        return;
    }

    const outputEl = document.createElement(type);
    outputEl.controls = true;
    outputContainer.appendChild(outputEl);

    lockButtons();

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

                outputContainer.innerHTML = '';

                pressedButton.innerHTML = 'Идет загрузка...'

                fetch(`${baseUrl}/upload`, {
                    method: 'POST',
                    body: formData,
                }).then(resp => {
                    if (!resp.ok) {
                        throw new Error(resp.statusText);
                    }
                    return resp.json();
                }).then(data => {
                    const url = `${baseUrl}/static/${data.name}`;
                    const recordEl = document.createElement(type);
                    recordEl.src = url;
                    recordEl.controls = true;
                    outputContainer.appendChild(recordEl);
                    pressedButton.innerHTML = 'Загрузка завершена';
                    newPostData.url = url;
                    outputContainer.appendChild(closeEl);
                }).catch(e => {
                    console.log(e);
                }).finally(() => {
                    addNewPostButtonEl.disabled = false
                });
            });

            mediaRecorder.start();
            pressedButton.innerHTML = 'Идет запись...'
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

function lockButtons() {
    buttonsArray.forEach((button) => {
        if (button.dataset.type === 'image') {
            button.classList.add('disabled');
            button.classList.remove('cursor-pointer');
            button.closest('label').setAttribute('for', '');
        } else {
            button.disabled = 'true';
        }
    })
}

function unlockButtons() {
    buttonsArray.forEach((button) => {
        if (button.dataset.type === 'image') {
            button.classList.remove('disabled');
            button.classList.add('cursor-pointer');
            button.closest('label').setAttribute('for', 'image');
        } else {
            button.disabled = false;
        }
    })
}

function fullReset() {
    outputContainer.innerHTML = '';
    unlockButtons();
    if (newPostData.type === 'Аудио') {
        audioButtonEl.innerHTML = 'Добавить аудиозапись';
    } else if (newPostData.type === 'Видео') {
        videoButtonEl.innerHTML = 'Добавить видеозапись'
    } else {
        imageButtonEl.innerHTML = 'Добавить картинку'
    }
    newPostData = {
        type: 'Обычный'
    }
}

addOldPosts();

setInterval(() => {
    fetch(`${baseUrl}/posts/fresh-posts-check/${freshestPostId}`)
        .then(
            response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.text();
            }
        ).then(
            data => {
                if (data === 'false') {
                    return;
                }
                addFreshPostsButtonEl.classList.remove('d-none');
                addFreshPostsButtonEl.classList.add('d-block');
            }
        ).catch(error => {
            console.log(error);
        });
}, 5000)