import {
    redoBtn,
    undoBtn,
} from '../dom-selections.js';
import { lastId } from '../helper-functions.js';

export default (drawing) => {
    const drawingBackups = [structuredClone(drawing)];
    let currentIndex = 0;

    document.addEventListener('DOMContentLoaded', toggleTimeTravelButtons, { once: true });
    document.addEventListener('clearHistory', clearHistory);

    function clearHistory() {
        drawingBackups.length = 0;
        currentIndex = 0;
        toggleTimeTravelButtons();
    }

    /**
    * Backs up the drawing and sets currentItem to point at that. Also, if there were items afterwards, they're truncated.
    * @param { Object } newDrawing A clone of the relevant bits of drawing after some mutation.
    */
    function createBackup(newDrawing) {
        if (currentIndex < lastId(drawingBackups)) {
            drawingBackups.length = currentIndex + 1;
        }

        drawingBackups.push(newDrawing);
        currentIndex = lastId(drawingBackups);
        toggleTimeTravelButtons();
    }

    function currentItem() {
        return drawingBackups[currentIndex];
    }

    function redo() {
        if (currentIndex < lastId(drawingBackups)) {
            currentIndex += 1;
            resetCanvas();
            toggleTimeTravelButtons();
        }
    }

    function resetCanvas() {
        const { layers: layersData, transforms } = currentItem();

        Object.assign(drawing, {
            layers: structuredClone(layersData),
            transforms: structuredClone(transforms)
        });
        document.dispatchEvent(new Event('initializeCanvas'));
    }

    function toggleTimeTravelButtons() {
        undoBtn.disabled = currentIndex === 0;
        redoBtn.disabled = drawingBackups.length === 0 || currentIndex === lastId(drawingBackups);
    }

    function undo() {
        if (drawingBackups.length > 1 && currentIndex > 0) {
            currentIndex -= 1;
            resetCanvas();
            toggleTimeTravelButtons();
        }
    }

    return {
        createBackup,
        redo,
        undo,
    };
};