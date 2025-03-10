import drawing, { redo, save, undo } from './drawing/drawing';
import { duplicateLayer } from './layers/layer-handling';
import { cmdTags } from './layers/path-commands';
import session from './session';
import { applyTransforms } from './transform-handling';

const ctrlActions = {
    C: duplicateLayer,
    Z: undo,
    Y: redo,
};
const arrowKeyActions = Object.freeze({
    ARROWUP: Object.freeze({ affectedAxis: 1, translation: decrementByOne }),
    ARROWDOWN: Object.freeze({ affectedAxis: 1, translation: incrementByOne }),
    ARROWLEFT: Object.freeze({ affectedAxis: 0, translation: decrementByOne }),
    ARROWRIGHT: Object.freeze({ affectedAxis: 0, translation: incrementByOne }),
});

export { pressKey, arrowKeyup };

function pressKey(event) {
    let { key } = event;
    key = key.toUpperCase();

    // prevent interference w opening dev tools
    if (key === 'F12') return;

    // exit label editing by pressing enter
    if (key === 'ENTER' && event.target.contentEditable) {
        event.target.blur();
    }

    // prevent interference w eg custom labeling
    if (document.activeElement !== document.body) return;

    if (key in ctrlActions && event.ctrlKey) {
        ctrlActions[key]();
    } else if (key in arrowKeyActions) {
        if (!session.activeLayer && !event.ctrlKey) return;

        // move the entire drawing when ctrl is pressed, otherwise only the active layer
        const { transforms: { translate: targetedTranslationObject } } = event.ctrlKey
            ? drawing
            : session.activeLayer;
        const { translation, affectedAxis } = arrowKeyActions[key];

        targetedTranslationObject[affectedAxis] = translation(targetedTranslationObject[affectedAxis]);
        applyTransforms(drawing, session);
    } else if (cmdTags.has(key)) {
        session.cmd = key;
    }

    event.preventDefault();
}

function arrowKeyup({ key }) {
    if (key in arrowKeyActions) {
        save('keyup');
    }
}

function incrementByOne(num) {
    return num + 1;
}

function decrementByOne(num) {
    return num - 1;
}