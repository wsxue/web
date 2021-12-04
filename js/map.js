const TK = 'pk.eyJ1Ijoic2NvdHRodWdoZXMiLCJhIjoiY2p3bWg5OTc5MGJ0NzRha2VlbXFtOTZheSJ9.c4EyzyAn28dXg3HujMoarg';
const TILESET_ID = "mapbox://scotthughes.ckwd856ls8q6325nzpgr6wrbk-1g3i1";
const SOURCE_LAYER = 'surreyTest';
let SOURE_ID = 'my-source';
let LAYET_ID = 'my-layer';
const API_URL = 'https://jfc8ym1gqj.execute-api.us-east-1.amazonaws.com/dev/imgretriever';

function addSource(map, sourceId) {
    sourceId && (SOURE_ID = sourceId);
    map.addSource(getSourceId(), {
        type: 'vector',
        url: TILESET_ID
    });
    return map.getSource(getSourceId());
}

function getSourceId() {
    return SOURE_ID;
}


function addLayer(map, layerId, filter = []) {
    layerId && (LAYET_ID = layerId);
    let option = {
        id: getLayerId(),
        source: getSourceId(),
        'source-layer': SOURCE_LAYER,
        type: 'symbol',
        layout: {
            'icon-image': 'position',
            'icon-size': 0.05,
            'text-field': ['get', 'station_name'],
            'text-anchor': 'bottom',
            'text-offset': [0, 2]
        },
        paint: {
            'icon-opacity': 1,
            'icon-color': '#FFFFFF',
            'text-color': '#00FA9A'
        }
    };
    if (filter.length != 0) {
        option = Object.assign(option, { filter: filter });
    }
    map.addLayer(option);
    return map.getLayer(getLayerId());
}

function getLayerId() {
    return LAYET_ID;
}


function addImage(map) {
    map.loadImage(camera_leave, (error, img) => {
        if (error) throw error;
        !map.hasImage('camera_leave') && map.addImage('camera_leave', img, { sdf: false });
    });
    map.loadImage(camera_enter, (error, img) => {
        if (error) throw error;
        !map.hasImage('camera_enter') && map.addImage('camera_enter', img, { sdf: false });
    });
    map.loadImage(position, (error, img) => {
        if (error) throw error;
        !map.hasImage('position') && map.addImage('position', img, { sdf: false });
    })
}

function changeImg(map, layerId, featureName, imgName) {
    if (featureName) {
        map.setFilter(layerId, ['==', 'station_name', featureName]);
        map.setLayoutProperty(layerId, 'icon-image', imgName);
    } else {
        map.setFilter(layerId, ['==', 'station_name', '']);
    }
}

/**
 * 
 * @param {Map} map
 * @param {Array} boundary: view boundary
 */
function getFeaturesInView(map, layerId, boundary) {
    return map.queryRenderedFeatures({
        layers: ['surrey-test']
    })
}

// API function
function getDataFromApi(feature) {
    return new Promise((resolve, reject) => {
        let data = fetch(API_URL + '?station=' + feature.station_name, {
            method: 'GET'
        })
            .then(result => result.json())
            .catch(err => console.log(err));
        resolve(data);
    })
}

// css function


function animate(tag, attr, target) {
    clearInterval(tag.timer);
    tag.timer = setInterval(function () {
        let leader = parseInt(getStyle(tag, attr)) || 0;
        let step = (target - leader) / 10;
        step = step > 0 ? Math.ceil(step) : Math.floor(step);
        leader = leader + step;
        tag.style[attr] = leader + "px";
        if (leader == target) {
            clearInterval(tag.timer);
        }
    }, 17);
}


function getStyle(tag, attr) {
    if (tag.currentStyle) {
        return tag.currentStyle[attr];
    } else {
        return getComputedStyle(tag, null)[attr];
    }
}

async function appendChildren(element, feature) {
    let temp = document.createElement('div');
    let appendInnerHTML = document.getElementById('template').innerHTML;
    temp.innerHTML = appendInnerHTML;
    temp.firstElementChild.id = feature.station_name;
    // console.log('firstElemnetChild: \n', temp.firstElementChild);
    temp.getElementsByClassName('station_name')[0].innerText = feature.station_name;
    temp.getElementsByClassName('street_address')[0].innerText = feature.street_address;
    temp.getElementsByClassName('street_address')[0].title = feature.street_address;
    temp.getElementsByClassName('lng')[0].innerText = feature.lng;
    temp.getElementsByClassName('lat')[0].innerText = feature.lat;
    let result = await getDataFromApi(feature);
    if (result.isBase64Encoded) {
        let img_base64 = 'data:' + result.headers['Content-Type'] + ';base64,' + result.body;
        temp.getElementsByClassName('c_img')[0].setAttribute('src', img_base64);
        // img status
        temp.getElementsByClassName('c_img')[0].onerror = () => {
            temp.getElementsByClassName('c_img')[0].setAttribute('alt', 'Image decode failed');
        };
        temp.getElementsByClassName('c_img')[0].onload = () => {
            temp.getElementsByClassName('c_img')[0].setAttribute('alt', 'Image loaded');
        };
    } else if (result.errorType) {
        console.log(result.errorType);
        temp.getElementsByClassName('c_img')[0].setAttribute('src', '');
        temp.getElementsByClassName('c_img')[0].setAttribute('alt', 'Image failed to load');
    }
    return temp.innerHTML;
}

function renderDom() {
    // get current viewregion point
    let features = getFeaturesInView(map, 'surrey-test');
    // console.log('features: \n', features);

    if (features.length > 0) {
        // firstly clear right_display children elemnet
        document.getElementById('right_display').innerHTML = '';

        // append elemnet
        let step = 4;
        for (let i = 0; i < Math.ceil(features.length / step); i++) {
            let promises = [];
            let element = document.getElementById('right_display');
            // each 10 promise update 1th dom
            for (let j = step * i; j < step * (i + 1); j++) {
                if (j == features.length) break;
                promises.push(appendChildren(element, {
                    station_name: features[j].properties.station_name,
                    street_address: features[j].properties.street_address,
                    lng: features[j].geometry.coordinates[0].toFixed(6),
                    lat: features[j].geometry.coordinates[1].toFixed(6)
                }));
            }
            // operate DOM
            Promise.all(promises).then(values => {
                document.getElementById('right_display').innerHTML += values.join('');
                // onclick
                let doms = document.getElementsByClassName('c_img');
                delete doms[doms.length - 1];
                Array.from(doms).forEach(el => {
                    el.onclick = (e) => {
                        // console.log(window);
                        window.location.href = `../html/img.html?base64=${e.srcElement.currentSrc}`;
                        // console.log(e.srcElement.currentSrc);
                    }
                })
            })
        }

    } else {
        // clear right_display
        let elemnet = document.getElementById('right_display');
        elemnet.innerHTML = 'No data';
        elemnet.style.fontSize = '20px';
        elemnet.style.padding = '10px';
    }
}

function highLingtImg(id) {
    let currentNode = document.getElementById(id);
    if (currentNode) {
        let doms = document.getElementsByClassName('img_content');
        delete doms[doms.length - 1];
        Array.from(doms).forEach(el => el.setAttribute('class', 'img_content'));
        currentNode.parentNode.removeChild(currentNode);
        let domNode = document.getElementsByClassName('img_content')[0];
        currentNode.setAttribute('class', 'img_content high_light');
        document.getElementById('right_display').insertBefore(currentNode, domNode);
    }
}