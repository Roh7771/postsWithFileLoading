import record from './media'

const baseUrl = 'https://posts-on-express.herokuapp.com';
let freshestPostId = 0;
let lastSeenPostId = 0;

const rootEl = document.getElementById('root');

const formEl = document.createElement('form');
// formEl.enctype = "multipart/form-data";
formEl.innerHTML = `
    <div class="form-group">
        <label>Введите текст или Url</label>
        <input class="form-control" data-type="text">
    </div>
    <div class="form-group">
        <label>Выберите тип поста</label>
        <select class="form-control" data-type="select">
            <option>Обычный</option>
            <option>Картинка</option>
            <option>Видео</option>
            <option>Аудио</option>
        </select>
    </div>
    <div class="form-group">
        <button class="btn btn-primary" data-type="audio">Добавить аудиозапись</button>
        <button class="btn btn-primary" data-type="video">Добавить видеозапись</button>
        <input type="file" data-type="image" name="image">
    </div>
    <div class="embed-responsive embed-responsive-16by9 output">
        
    </div>
    <button class="btn btn-primary" data-type="button">Опубликовать</button>
`;

const outputContainer = formEl.querySelector('.output')

const audioButtonEl = formEl.querySelector('[data-type=audio]');
audioButtonEl.addEventListener('click', (e) => {
    e.preventDefault();
    record('audio', outputContainer)
});

const imageButtonEl = formEl.querySelector('[data-type=image]');
imageButtonEl.addEventListener('change', ev => {
    ev.preventDefault();
    console.log(ev.currentTarget.files)
    // File -> Blob (__proto__)
    // [a, b, c] = [1, 2, 3, 4, 5] -> a - 1, b - 2, ...
    const [first] = Array.from(ev.currentTarget.files);
    // FormData
    const formData = new FormData();
    formData.append('image', first);
    sendEl.disabled = true;
    fetch('http://localhost:9999/upload', {
        method: 'POST',
        body: formData, // Content-Type: multipart/form-data выставится автоматически
    }).then(resp => {
        if (!resp.ok) {
            throw new Error(resp.statusText);
        }
        return resp.json();
    }).then(data => {
        const imageUrl = `http://localhost:9999/static/${data.name}`;
        const imageEl = document.createElement('img');
        urlEl.value = imageUrl;
        imageEl.src = imageUrl;
        document.body.appendChild(imageEl);
    }).catch(e => {
        console.log(e);
    }).finally(() => {
        sendEl.disabled = false;
    });
    ev.currentTarget.value = ''; // хак для сброса выбранного файла
});

const textEl = formEl.querySelector('[data-type=text]');
textEl.value = localStorage.getItem('text');
textEl.addEventListener('input', e => {
    localStorage.setItem('text', e.currentTarget.value);
})
const selectEl = formEl.querySelector('[data-type=select]');
selectEl.value = localStorage.getItem('type') || 'Обычный';
selectEl.addEventListener('input', e => {
    localStorage.setItem('type', e.currentTarget.value);
})
const addNewPostButonEl = formEl.querySelector('[data-type=button]');
addNewPostButonEl.addEventListener('click', e => {
    e.preventDefault();
    const data = {
        text: textEl.value,
        type: selectEl.value,
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
            selectEl.value = 'Обычный';
            localStorage.clear();
            freshPostsRender(data);
        }
    ).catch(error => {
        console.log(error);
    });

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
                <img src="${item.text}" class="card-img-top">
                <div class="card-body">
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
                    <video src="${item.text}" controls=""></video>
                </div>
                <div class="card-body">
                    <button data-action="like" class="btn btn-primary mr-2">❤ ${item.likes}</button>
                    <button data-action="dislike" class="btn btn-primary mr-2">👎</button>
                    <button data-action="delete" class="btn btn-primary">Удалить пост</button>
                </div>
            </div>
       `;
    } else if (item.type === 'Аудио') {
        newPostEl.innerHTML = `
            <div class="card">
                <audio controls="" class="card-img-top" src="${item.text}"></audio>
                <div class="card-body">
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