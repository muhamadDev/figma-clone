let canvas = new fabric.Canvas('canvas', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "white",
});


let state;

let undo = [];
let redo = [];
let currentColor = '#000000';
let brushWidth = 5;

let coppyedObject;

const deleteBtn = document.querySelector('.deleteBtn');

const drawingModeBtn = document.querySelector('.drawingMode');


save();

const copyBtn = document.querySelector('.copy');
const pasteBtn = document.querySelector('.paste');

const radiusRange = document.querySelector('.radiusRange');
const opacityRange = document.querySelector('.opacityRange');

const fillCheckbox = document.querySelector('#fillCheckbox');
const strockCheckbox = document.querySelector('#strockCheckbox');


document.querySelectorAll('.objects li').forEach((li) => {
    
    li.addEventListener('click', ()=> {
        const data = li.dataset.name;
        
        const obj = new fabric[data]({
            fill: currentColor,
            radius: 50,
            width:100,
            height: 100,
            left: getCenter().x - 50,
            top: getCenter().y - 50,
            borderColor: '#2884c6',
            transparentCorners: false,
            cornerStrokeColor: '#2884c6',
            cornerStrokeSize:90,
            cornerColor: 'rgba(255, 255, 255, 50)',
            cornerSize: 8,
            padding: 5,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.3)',
                blur: 10, 
                offsetX: 5, 
                offsetY: 5,
            })
        });
        
        setMustDraw(false)
        canvas.add(obj);
        canvas.renderAll();
        save();
        
    });
    
});


canvas.on('object:modified', function() {
    save();
});


const pickr = Pickr.create({
    el: '.color-picker',
    default: '#000000',
    closeWithKey: 'Escape',
    theme: 'nano',
    comparison: false,
    padding: 8,
    swatches: [],
    
    components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
            hex: true,
            rgba: true,
            hsla: false,
            hsva: false,
            cmyk: false,
            input: true,
            clear: false,
            save: false
        }
    }
});

pickr.on("changestop", (a, instance) => {
    
    const colorInHex = instance._color.toHEXA().toString();
    currentColor = colorInHex;
    
    const selectedObjects = canvas.getActiveObjects();
    
    setMustDraw(canvas.isDrawingMode)

    if(selectedObjects.length == 0) return;
    
    selectedObjects.forEach((selectedObject) => {
        
        selectedObject.set({
            "fill": fillCheckbox.checked ? colorInHex : null,
            'stroke' : strockCheckbox.checked ? colorInHex : null
        });
        
    });
    
    canvas.renderAll();
    save();
    
});


deleteBtn.addEventListener("click", () => {
    const selectedObjects = canvas.getActiveObjects();
    
    selectedObjects.forEach((selectedObject) => {
        canvas.remove(selectedObject)
    });
    
    canvas.discardActiveObject();
    canvas.renderAll();
    save()
    
});

drawingModeBtn.addEventListener('click' , () => {
    setMustDraw(!canvas.isDrawingMode)
})

copyBtn.addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length <= 0) return;
    
    const svgStrings = activeObjects.map(obj => obj.toSVG()).join('\n');
    
    const svgOutput = `<svg xmlns="http://www.w3.org/2000/svg">\n${svgStrings}\n</svg>`;
    
    copyToClipboard(svgOutput)
});

pasteBtn.addEventListener('click', () => {
    navigator.clipboard.readText()
    .then(text => {
        const isTextASvg = text.trim().startsWith('<svg');
        
        if(!isTextASvg) {
            console.log("coming soon");
            const textObj = new fabric.Text(text, {
                left: 100,   
                top: 100, 
                fontSize: 24,  
                fill: currentColor,
            });
            canvas.add(textObj);
            canvas.renderAll();
            save()
            return 
        }

        fabric.loadSVGFromString(text, (objects, options) => {
            
            objects.forEach((obj) => canvas.add(obj));
            canvas.renderAll();
            save();
            
        });
        
    })
    .catch(err => {
        console.error('Failed to read clipboard contents: ', err);
    });
    
});

radiusRange.addEventListener('input', () => {
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length <= 0) return;
    
    activeObjects.forEach((activeObject) => {
        
        activeObject.set({
            rx: +radiusRange.value,
            ry: +radiusRange.value,
        });
        
    });
    
    
    canvas.renderAll();
    save();
}); 

opacityRange.addEventListener('input', () => {
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length <= 0) return;
    
    activeObjects.forEach((activeObject) => {
        
        activeObject.set({
            opacity: +opacityRange.value /100,
        });
        
    });
    
    
    canvas.renderAll();
    save();

})


fillCheckbox.addEventListener('change', ({target}) => {
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length <= 0) return;
    
    activeObjects.forEach((activeObject) => {
        
        activeObject.set({
            fill: target.checked,
        });
        
    });
    
    
    canvas.renderAll();
    save();

});

strockCheckbox.addEventListener('change', ({target}) => {
   
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length <= 0) return;
    
    activeObjects.forEach((activeObject) => {
        
        activeObject.set({ 
            strokeWidth: 4,
            stroke: target.checked ? currentColor : null,
        });
        
    });
    
    
    canvas.renderAll();
    save();

   
});


document.addEventListener('keydown', (event) => {
    // undo
    if (event.ctrlKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        replay(undo, redo);
    }
    
    // redo
    else if (event.ctrlKey && event.key.toLowerCase()=== 'z' && event.shiftKey) {
       replay(redo, undo);
    }
    
    // redo
    if(event.ctrlKey && event.key.toLowerCase() === 'y' && !event.shiftKey) {
        replay(redo, undo);
    }
    
    //copy
    if (event.ctrlKey && event.key.toLowerCase() === 'c' && !event.shiftKey) {
        event.preventDefault();

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length <= 0) return;
         
        const svgStrings = activeObjects.map(obj => obj.toSVG()).join('\n');
        
        const svgOutput = `<svg xmlns="http://www.w3.org/2000/svg">\n${svgStrings}\n</svg>`;
        
        copyToClipboard(svgOutput)
    }
    
    // paste
    if (event.ctrlKey && event.key.toLowerCase() === 'v' && !event.shiftKey) {
        event.preventDefault();
        
        navigator.clipboard.readText()
        .then(text => {
            const isTextASvg = text.trim().startsWith('<svg');
            
            if(!isTextASvg) {
                console.log("coming soon");
                const textObj = new fabric.Text(text, {
                    left: 100,   
                    top: 100, 
                    fontSize: 24,  
                    fill: currentColor,
                });
                canvas.add(textObj);
                canvas.renderAll();
                save()
                return 
            }
            
            fabric.loadSVGFromString(text, (objects, options) => {
                
                objects.forEach((obj) => canvas.add(obj));
                canvas.renderAll();
                save();
                
            });
            
        })
        .catch(err => {
            console.error('Failed to read clipboard contents: ', err);
        });
        
    }
    
    // pen mode
    if (event.ctrlKey && event.key.toLowerCase() === 'p' && !event.shiftKey) {
        setMustDraw(!canvas.isDrawingMode)
    }

});


function save() {
    redo = [];

    if (state) {
        undo.push(state);
    }
    
    state = JSON.stringify(canvas);
}

function replay(playStack, saveStack) {
    saveStack.push(state);
    
    state = playStack.pop();

    canvas.clear();
    canvas.setBackgroundColor("white");
    
    canvas.loadFromJSON(state, function() {
        canvas.renderAll();
    });
}


function getCenter() {
    return {
        x: window.innerWidth/ 2,
        y: window.innerHeight /2
    }
}

function setMustDraw(bool = true) {
    canvas.isDrawingMode = bool;
    
    canvas.freeDrawingBrush.color = currentColor;
    canvas.freeDrawingBrush.width = brushWidth; 
    
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.3)',
        blur: 10, 
        offsetX: 5, 
        offsetY: 5
    });
    
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    .then(() => {
        console.log('Text copied to clipboard:', text);
    })
    .catch(err => {
        console.error('Failed to copy text: ', err);
    });
}






// 2 finger dubble tap and 3 finger dubble tap;

let ele = document.querySelector('.upper-canvas')

var myRegion = new ZingTouch.Region(ele);


const dubble2FingerTap = new ZingTouch.Tap({
    maxDelay: 200,
    numInputs: 2,
    tolerance: 125
});

myRegion.bind(ele, dubble2FingerTap, function(e) {});


const dubbleTap = new ZingTouch.Tap({
    maxDelay: 220,
    numInputs: 3,
});

let tapCount = 0;
let tapTimeout;


myRegion.bind(ele, dubbleTap, function(e) {
    tapCount++;
    if (tapCount === 2) {
        
        if(e.detail.events.length == 3) replay(redo, undo);

        if (e.detail.events.length == 2) replay(undo, redo);
        
        tapCount = 0;
        clearTimeout(tapTimeout);
        return;
        
    }
    
    tapTimeout = setTimeout(() => {
        tapCount = 0;
    }, 300);
    
});



// drag and drop

const container = document.querySelector('.container')

const swapy = Swapy.createSwapy(container, {
    animation: 'dynamic' 
});

swapy.enable(true)

swapy.onSwapEnd(({data, hasChanged}) => {
    if(!hasChanged) return;
    
    localStorage.setItem('swapyPosition', JSON.stringify(data.object));
    
});

document.addEventListener('DOMContentLoaded', () => {
    
    const data = JSON.parse(localStorage.getItem('swapyPosition'));
    if(!data) return;
    
    const slots = Object.keys(data);
    const items = Object.values(data)
    
    const slotsEl = slots.map((slot) => {
        return document.querySelector(`[data-swapy-slot=${slot}]`)
    });
    
    itemsEl = items.map((item) => {
        return document.querySelector(`[data-swapy-item=${item}]`);
    });
    
    slotsEl.forEach((slot, i) => {
        slot.append(itemsEl[i]);
    });
    
    
    
});


// open menu bar

const checkBox = document.querySelector('#openMenu');

checkBox.addEventListener('click', ({target}) => {
    document.querySelector('.leftMenu').classList.toggle('hidden', target.checked);
});