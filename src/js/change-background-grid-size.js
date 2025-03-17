const backgroundGridStepsize = 10;
const documentStyle = document.documentElement.style;

export default function changeBackgroundGridSize({ deltaY }) {
    const currentValue = Number(documentStyle.getPropertyValue('--bg-grid-size').replace('px', '')) || 40;
    // deltaY is negative when scrolling up
    const scalingDirection = deltaY < 0 ? -1 : 1;

    // acceptable range for gridsize is (x: 10 >= x <= 80)
    if ((scalingDirection === -1 && currentValue === 10)
        || (scalingDirection === 1 && currentValue === 80)
    ) return;

    documentStyle.setProperty(
        '--bg-grid-size', `${currentValue + backgroundGridStepsize * scalingDirection}px`,
    );
}