import {
    projectManagementOverlay,
    startNewDrawingBtn,
    loadDrawingBtn,
    drawingSelection,
    layerSelectors,
    deleteDrawingBtn
} from '../dom-selections';
import drawing, { clearDrawing, commitDrawingToStorage, isDrawingUntouched } from './drawing';
import session from '../session';

// TODO improve error handling (add a toast element and briefly show a relevant message!?)

const openDbRequest = window.indexedDB.open('savedDrawings');
const savedDrawingsOptions = drawingSelection.children;
const drawingNameInput = document.querySelector('#name-drawing-form input');
// this allows us to later tell which btn was initially pressed
let userIntent;
let db;

openDbRequest.addEventListener('error', console.error);
openDbRequest.addEventListener('success', () => {
    db = openDbRequest.result;
    db.addEventListener('error', console.error);
    document.dispatchEvent(new Event('dbOpened'));
});
openDbRequest.addEventListener('upgradeneeded', () => {
    db = openDbRequest.result;
    db.createObjectStore('drawings', { keyPath: 'name' });
    db.addEventListener('error', console.error);
    db.addEventListener('success', () => document.dispatchEvent(new Event('dbOpened')));
});
document.addEventListener('saveDrawing', toggleButtons);
document.addEventListener('dbOpened', () => {
    const objectStore = db
        .transaction('drawings', 'readonly')
        .objectStore('drawings');
    const countRequest = objectStore.count();

    countRequest.addEventListener('success', () => {
        if (countRequest.result > 0) {
            const getAllRequest = objectStore.getAll();

            getAllRequest.addEventListener('success', () => {
                // populate drawing selection
                drawingSelection
                    .append(
                        ...getAllRequest.result
                            .map(({ name }) => Object.assign(
                                document.createElement('option'), { textContent: name }
                            ))
                    );
                toggleButtons();
            });
        } else {
            toggleButtons();
        }
    });
});
startNewDrawingBtn.addEventListener('click', () => {
    userIntent = 'start-new-drawing';
    // if the drawing is clean, dont ask the user to save and take em directly to the drawing-selection
    projectManagementOverlay.dataset.step = isDrawingUntouched()
        ? 'select-drawing'
        : '';
    projectManagementOverlay.showModal();
});
loadDrawingBtn.addEventListener('click', () => {
    userIntent = 'load-drawing';
    // possibly ask the user what to do w the current workspace before loading (update or save)
    projectManagementOverlay.dataset.step = isDrawingUntouched()
        ? 'select-drawing'
        : '';
    projectManagementOverlay.showModal();
});
deleteDrawingBtn.addEventListener('click', () => {
    userIntent = 'delete-drawing';
    projectManagementOverlay.dataset.step = 'select-drawing';
    projectManagementOverlay.showModal();
});
projectManagementOverlay.addEventListener('submit', (event) => {
    // NOTE: the modal contains several forms, which are hidden/shown based on their id
    // so the targets id tells us which has just been submitted
    // NOTE: further, some forms form paths and steps along those are linked via the data-step attr
    switch (event.target.id) {
        case 'save-drawing-form':
            // NOTE: if there're diverging paths in a form, we can tell which by the submitters btnRole
            switch (event.submitter.dataset.btnRole) {
                case 'save-drawing':
                    // if the current drawing already has a name, set the input field's value to that
                    if (drawing.name !== '') {
                        drawingNameInput.value = drawing.name;
                    }

                    // prompt the user for a name for the drawing
                    projectManagementOverlay.dataset.step = 'enter-name';
                    break;
                case 'discard-drawing':
                    clearWorkspace();

                    if (userIntent === 'start-new-drawing') {
                        // if the user wanted to start a new drawing and there's no saved drawing, we're done
                        // else ask if they want to start fresh or based on another
                        if (savedDrawingsOptions.length === 0) {
                            projectManagementOverlay.close();
                        } else {
                            projectManagementOverlay.dataset.step = 'select-type-of-new-project';
                        }
                    } else if (userIntent === 'load-drawing') {
                        projectManagementOverlay.dataset.step = 'select-drawing';
                    }
                    break;
                case 'cancel':
                default:
                    projectManagementOverlay.close();
                    break;
            }
            break;
        case 'name-drawing-form':
            if ([...savedDrawingsOptions]
                .some(({ textContent }) => textContent === drawingNameInput.value)
            ) {
                // there's already a stashed drawing by that name. ask the user if they want to update
                projectManagementOverlay.dataset.step = 'confirm-drawing-update';
            } else {
                // save the current drawing w the provided name
                saveDrawing(drawingNameInput.value);
                // if there's sth to load, ask user if they want to start fresh or based on another drawing
                if (savedDrawingsOptions.length > 0) {
                    projectManagementOverlay.dataset.step = 'select-type-of-new-project';
                } else {
                    // there's no drawing to load, so clear the workspace
                    clearWorkspace();
                    projectManagementOverlay.close();
                }
            }

            break;
        case 'update-drawing-form':
            switch (event.submitter.dataset.btnRole) {
                case 'select-update':
                    updateDrawing(drawingNameInput.value);
                    projectManagementOverlay.dataset.step = 'select-type-of-new-project';
                    break;
                case 'change-name':
                    projectManagementOverlay.dataset.step = 'enter-name';
            }
            break;
        case 'select-type-of-new-project-form':
            switch (event.submitter.dataset.btnRole) {
                case 'select-fresh-start':
                    clearWorkspace();
                    projectManagementOverlay.close();
                    break;
                case 'select-a-base':
                    // prompt user to pick a base
                    projectManagementOverlay.dataset.step = 'select-drawing';
            }
            break;
        case 'select-drawing-form':
            if (userIntent === 'delete-drawing') {
                deleteDrawing(drawingSelection.value);
            } else {
                loadAndApplyDrawing(drawingSelection.value);
            }

            projectManagementOverlay.close();
    }
});

/** Clear the current drawing and erase it's history. */
function clearWorkspace() {
    clearDrawing();
    document.dispatchEvent(new Event('clearHistory'));
}

function loadAndApplyDrawing(name) {
    if (!db) return;

    const transaction = db.transaction(['drawings'], 'readwrite');
    const getRequest = transaction
        .objectStore('drawings')
        .get(name);

    // apply the loaded drawing
    getRequest.addEventListener('success', () => {
        const { layers: layersData, transforms, name } = getRequest.result;

        // update the data
        Object.assign(drawing, {
            name: userIntent === 'start-new-drawing' ? '' : name,
            layers: structuredClone(layersData),
            transforms: structuredClone(transforms)
        });
        Object.assign(session, {
            layerId: 0,
            mode: layersData[0].mode
        });
        // store the loaded drawing in localStorage
        commitDrawingToStorage();
        // update btn state
        toggleButtons();
        // trigger update of the workspace
        document.dispatchEvent(new Event('initializeCanvas'));
        // select the active layer
        layerSelectors[session.layerId].checked = true;
    });
    getRequest.addEventListener('error', console.log);
}

function updateDrawing(name) {
    if (!db) return;

    drawing.name = name;

    const transaction = db.transaction(['drawings'], 'readwrite');
    const putRequest = transaction
        .objectStore('drawings')
        .put(drawing);

    putRequest.addEventListener('error', console.log);
}

function saveDrawing(name) {
    if (!db) return;

    drawing.name = name;

    const transaction = db.transaction(['drawings'], 'readwrite');
    const addRequest = transaction
        .objectStore('drawings')
        .add(drawing);

    addRequest.addEventListener('success', () => {
        // add name of newly saved drawing to drawing selection
        drawingSelection.append(Object.assign(
            document.createElement('option'),
            { textContent: name }
        ));
        toggleButtons();
    });
    addRequest.addEventListener('error', console.log);
}

function deleteDrawing(name) {
    if (!db) return;

    const deleteRequest = db
        .transaction(['drawings'], 'readwrite')
        .objectStore('drawings')
        .delete(name);

    // the drawing will remain in localStorage, but wo a name
    drawing.name = '';
    commitDrawingToStorage();
    document.dispatchEvent(new Event('initializeCanvas'));

    // delete the option once the drawing is deleted
    deleteRequest.addEventListener('success', () => {
        [...savedDrawingsOptions].find((option) => option.textContent === name).remove();
        toggleButtons();
    });
    deleteRequest.addEventListener('error', console.log);
}

/** Enable or disable the related buttons as needed (when drawing or db are changed). */
function toggleButtons() {
    const thereAreNoSavedDrawings = savedDrawingsOptions.length === 0;

    // disable this btn if there's no saved drawing and the current drawing is untouched
    startNewDrawingBtn.disabled = thereAreNoSavedDrawings && isDrawingUntouched();
    // disable this btn if there're no saved projects or the current one is the only one saved
    loadDrawingBtn.disabled = thereAreNoSavedDrawings || (
        savedDrawingsOptions.length === 1 &&
        drawingSelection.value === drawing.name
    );
    // there's no stashed drawing, so there's nothing to delete
    deleteDrawingBtn.disabled = thereAreNoSavedDrawings;
}