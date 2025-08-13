
function openPart(evt, name) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(name).style.display = "block";
    evt.currentTarget.className += " active";

}

function startup()
{
    document.getElementById("default").click();
}

window.onload = startup;


class AntennaSystem {
    constructor() {
        this.svg = d3.select('#diagram');
        this.setupEventListeners();
        this.setupAntennaSymbols();
    }

    setupAntennaSymbols() {
        const defs = this.svg.append('defs');

        // Transmitter antenna symbol (larger)
        defs.append('symbol')
            .attr('id', 'transmitter')
            .attr('viewBox', '0 0 100 100')
            .append('image')
            .attr('href', './images/antenna-small.svg')
            .attr('width', '100')
            .attr('height', '100');

        // Receiver antenna symbol (smaller)
        defs.append('symbol')
            .attr('id', 'receiver')
            .attr('viewBox', '0 0 100 100')
            .append('image')
            .attr('href', './images/antenna-small.svg')
            .attr('width', '100')
            .attr('height', '100');

        // Arrow marker for signal paths
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 10)
            .attr('refY', 5)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 Z')
            .attr('fill', 'var(--secondary-color)');
    }
    setupEventListeners() {
        const generateButton = document.getElementById('generate-diagram');
        const applyDiversityButton = document.getElementById('apply-diversity');
        const resetButton = document.getElementById('reset-experiment');
        const combiningMethodContainer = document.getElementById('combining-method-container');

        generateButton.addEventListener('click', () => {
            this.generateSystemDiagram();
            // Once the diagram is generated and combining method is visible, toggle buttons
            if (combiningMethodContainer.style.display === 'block') {
                generateButton.style.display = 'none';
                applyDiversityButton.style.display = 'block';
                resetButton.style.display = 'block';
            }
        });

        applyDiversityButton.addEventListener('click', () => this.applyDiversity());

        resetButton.addEventListener('click', () => {
            this.svg.selectAll('*').remove();
            combiningMethodContainer.style.display = 'none';
            generateButton.style.display = 'block';
            applyDiversityButton.style.display = 'none';
            resetButton.style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            document.getElementById('table-container').style.display = 'none';
        });
    }

    generateSystemDiagram() {
        const systemType = document.getElementById('system-type').value;
        const numAntennas = parseInt(document.getElementById('num-antennas').value, 10);

        if (isNaN(numAntennas) || numAntennas < 1 || numAntennas > 10) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Please enter a valid number of antennas (1-10).';
            errorMessage.style.display = 'block';
            return;
        }

        const errorMessage = document.getElementById('error-message');
        errorMessage.style.display = 'none';

        this.svg.selectAll('*').remove();
        this.setupAntennaSymbols();

        const coefficients = this.generateRayleighCoefficients(numAntennas);
        const weights = coefficients.map(() => 1 / numAntennas); // Default weights

        // Render diagram with default weights
        this.renderDiagram(systemType, numAntennas, coefficients, weights);

        // Make combining method dropdown visible
        const combiningMethodContainer = document.getElementById('combining-method-container');
        combiningMethodContainer.style.display = 'block';

        // Display default coefficients and weights
        this.displayCoefficients(coefficients, weights);
    }

    applyDiversity() {
        const combiningMethod = document.getElementById('combining-method').value;
        const systemType = document.getElementById('system-type').value;
        const numAntennas = parseInt(document.getElementById('num-antennas').value, 10);

        const coefficients = this.generateRayleighCoefficients(numAntennas);
        const weights = this.calculateWeights(coefficients, combiningMethod);

        this.displayCoefficients(coefficients, weights);
        this.renderDiagram(systemType, numAntennas, coefficients, weights);
    }

    generateRayleighCoefficients(numAntennas) {
        return Array.from({ length: numAntennas }, () => {
            const u1 = Math.random();
            const u2 = Math.random();
            const coefficient = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return Math.abs(coefficient); // Return the absolute value
        });
    }

    calculateWeights(coefficients, method) {
        switch (method) {
            case 'EGC':
                return coefficients.map(() => 1 / coefficients.length);
            case 'SC':
                const maxIndex = coefficients.indexOf(Math.max(...coefficients));
                return coefficients.map((_, i) => i === maxIndex ? 1 : 0);
            case 'MRC':
                const normFactor = Math.sqrt(coefficients.reduce((sum, c) => sum + c ** 2, 0));
                return coefficients.map(coeff => coeff / normFactor);
            default:
                throw new Error('Invalid combining method');
        }
    }
    displayCoefficients(coefficients, weights) {
        const container = document.getElementById('table-container');
        container.style.display = 'block';
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">Antenna</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Channel Coeff.</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Weight</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Combined Gain</th>
                    </tr>
                </thead>
                <tbody>
                    ${coefficients.map((coeff, i) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${i + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${coeff.toFixed(3)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${weights[i].toFixed(3)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${(coeff * weights[i]).toFixed(3)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderDiagram(systemType, numAntennas, coefficients, weights) {
        this.svg.selectAll('*').remove();
        this.setupAntennaSymbols();

        const width = 800;
        const height = 600;
        const centerX = width / 4;
        const centerY = height / 2;
        const antennaSize = 50;
        const verticalSpacing = 70;
        const gap = 20;

        const rightX = width * 0.75;
        const startY = centerY - ((numAntennas - 1) * verticalSpacing) / 2;

        if (systemType === 'SIMO') {
            // Single transmitter on the left, multiple receivers on the right
            this.svg.append('use')
                .attr('href', '#transmitter')
                .attr('class', 'antenna-image')
                .attr('x', centerX - antennaSize / 2)
                .attr('y', centerY - antennaSize / 2)
                .attr('width', antennaSize)
                .attr('height', antennaSize);

            for (let i = 0; i < numAntennas; i++) {
                const y = startY + i * verticalSpacing;

                this.svg.append('line')
                    .attr('class', 'line')
                    .attr('x1', centerX + gap)
                    .attr('y1', centerY)
                    .attr('x2', rightX - gap)
                    .attr('y2', y)
                    .attr('marker-end', `url(#arrowhead)`);

                const labelOffset = 3.75;   // Offset from the line    
                const labelX = (centerX + rightX) / 2;
                const labelY = (centerY + y) / 2 - labelOffset; // Adjusted to appear above the line
                const angle = Math.atan2(
                    systemType === 'SIMO' ? y - centerY : centerY - y, 
                    systemType === 'SIMO' ? rightX - centerX : centerX - rightX
                ) * (180 / Math.PI);

                // Ensure the text is upright
                const adjustedAngle = angle < -90 || angle > 90 ? angle + 180 : angle;

                this.svg.append('text')
                    .attr('class', 'coefficient-label')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--secondary-color)')
                    .attr('transform', `rotate(${adjustedAngle}, ${labelX}, ${labelY})`)
                    .text(`h${i + 1}: ${coefficients[i].toFixed(2)}`);

                this.svg.append('text')
                    .attr('class', 'weight-label')
                    .attr('x', rightX + antennaSize / 2 + 26)
                    .attr('y', y)
                    .text(`W${i + 1}: ${weights[i].toFixed(2)}`);

                this.svg.append('use')
                    .attr('href', '#receiver')
                    .attr('class', 'antenna-image')
                    .attr('x', rightX - antennaSize / 2)
                    .attr('y', y - antennaSize / 2)
                    .attr('width', antennaSize)
                    .attr('height', antennaSize);
            }
        } else if (systemType === 'MISO') {
            // Multiple transmitters on the right, single receiver on the left
            this.svg.append('use')
                .attr('href', '#receiver')
                .attr('class', 'antenna-image')
                .attr('x', centerX - antennaSize / 2)
                .attr('y', centerY - antennaSize / 2)
                .attr('width', antennaSize)
                .attr('height', antennaSize);

            for (let i = 0; i < numAntennas; i++) {
                const y = startY + i * verticalSpacing;

                this.svg.append('line')
                    .attr('class', 'line')
                    .attr('x1', rightX - gap)
                    .attr('y1', y)
                    .attr('x2', centerX + gap)
                    .attr('y2', centerY)
                    .attr('marker-end', `url(#arrowhead)`); // Arrowhead at receiving end (single antenna)

                const labelOffset = 3.75;   // Offset from the line    
                const labelX = (centerX + rightX) / 2;
                const labelY = (centerY + y) / 2 - labelOffset; // Adjusted to appear above the line
                const angle = Math.atan2(
                    systemType === 'SIMO' ? y - centerY : centerY - y, 
                    systemType === 'SIMO' ? rightX - centerX : centerX - rightX
                ) * (180 / Math.PI);

                // Ensure the text is upright
                const adjustedAngle = angle < -90 || angle > 90 ? angle + 180 : angle;

                this.svg.append('text')
                    .attr('class', 'coefficient-label')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--secondary-color)')
                    .attr('transform', `rotate(${adjustedAngle}, ${labelX}, ${labelY})`)
                    .text(`h${i + 1}: ${coefficients[i].toFixed(2)}`);

                this.svg.append('text')
                    .attr('class', 'weight-label')
                    .attr('x', rightX + antennaSize / 2 + 26)
                    .attr('y', y)
                    .text(`W${i + 1}: ${weights[i].toFixed(2)}`);

                this.svg.append('use')
                    .attr('href', '#transmitter')
                    .attr('class', 'antenna-image')
                    .attr('x', rightX - antennaSize / 2)
                    .attr('y', y - antennaSize / 2)
                    .attr('width', antennaSize)
                    .attr('height', antennaSize);
            }
        } else {
            console.error(`Invalid system type: ${systemType}`);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const antennaSystem = new AntennaSystem();
});

// ------------------------------------------ On startup ----------------------------------------------------------