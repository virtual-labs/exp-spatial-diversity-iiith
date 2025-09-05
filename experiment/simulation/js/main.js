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

    // -------------------------------------------------------------------
    // NEW: Helper methods for complex number operations
    // -------------------------------------------------------------------

    /**
     * Formats a complex number or a real number for display in exponential form.
     * @param {object|number} c - The complex number {real, imag} or a real number.
     * @param {number} precision - The number of decimal places.
     * @returns {string} The formatted string (e.g., "1.234*e^(j0.567)").
     */
    formatComplex(c, precision = 3) {
        if (typeof c === 'number') {
            return c.toFixed(precision); // Handle real numbers gracefully
        }
        
        // Calculate magnitude and phase
        const magnitude = Math.sqrt(c.real ** 2 + c.imag ** 2);
        const phase = Math.atan2(c.imag, c.real);
        
        // Special cases
        if (magnitude === 0) {
            return '0.000';
        }
        
        if (Math.abs(phase) < 1e-10) {
            // Pure real positive number
            return magnitude.toFixed(precision);
        }
        
        if (Math.abs(Math.abs(phase) - Math.PI) < 1e-10) {
            // Pure real negative number
            return (-magnitude).toFixed(precision);
        }
        
        // General complex number in exponential form with superscript
        return `${magnitude.toFixed(precision)}*e<sup>j${phase.toFixed(precision)}</sup>`;
    }

    /**
     * Calculates the magnitude of a complex number.
     * @param {object|number} c - The complex number {real, imag} or a real number.
     * @returns {number} The magnitude.
     */
    getMagnitude(c) {
        if (typeof c === 'number') {
            return Math.abs(c);
        }
        return Math.sqrt(c.real ** 2 + c.imag ** 2);
    }

    /**
     * Multiplies two complex numbers (or a complex and a real number).
     * @param {object|number} c1
     * @param {object|number} c2
     * @returns {object} The resulting complex number {real, imag}.
     */
    multiplyComplex(c1, c2) {
        const val1 = (typeof c1 === 'number') ? { real: c1, imag: 0 } : c1;
        const val2 = (typeof c2 === 'number') ? { real: c2, imag: 0 } : c2;

        const real = val1.real * val2.real - val1.imag * val2.imag;
        const imag = val1.real * val2.imag + val1.imag * val2.real;
        return { real, imag };
    }

    // -------------------------------------------------------------------
    // Core class methods (with modifications)
    // -------------------------------------------------------------------

    setupAntennaSymbols() {
        const defs = this.svg.append('defs');

        // Transmitter antenna symbol
        defs.append('symbol')
            .attr('id', 'transmitter')
            .attr('viewBox', '0 0 100 100')
            .append('image')
            .attr('href', './images/antenna-small.svg')
            .attr('width', '100')
            .attr('height', '100');

        // Receiver antenna symbol
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
        const weights = coefficients.map(() => 1 / numAntennas); // Default real weights

        this.renderDiagram(systemType, numAntennas, coefficients, weights);

        const combiningMethodContainer = document.getElementById('combining-method-container');
        combiningMethodContainer.style.display = 'block';

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

    /**
     * MODIFIED: Generates complex Rayleigh fading channel coefficients.
     * Each coefficient is a complex number h = (z1 + j*z2)/sqrt(2),
     * where z1 and z2 are standard normal random variables.
     */
    generateRayleighCoefficients(numAntennas) {
        return Array.from({ length: numAntennas }, () => {
            // Box-Muller transform to get two standard normal random variables (z1, z2)
            const u1 = Math.random();
            const u2 = Math.random();
            const R = Math.sqrt(-2 * Math.log(u1));
            const theta = 2 * Math.PI * u2;
            const z1 = R * Math.cos(theta);
            const z2 = R * Math.sin(theta);

            // Return as a complex object, scaled for unit average power E[|h|^2] = 1
            return { real: z1 / Math.sqrt(2), imag: z2 / Math.sqrt(2) };
        });
    }

    /**
     * MODIFIED: Calculates weights - ALL weights are always real numbers.
     */
    calculateWeights(coefficients, method) {
        switch (method) {
            case 'EGC':
                // Equal Gain Combining: Equal real weights
                const N_egc = coefficients.length;
                return coefficients.map(() => 1 / N_egc);

            case 'SC':
                // Selection Combining: Select the branch with the highest |h|. Weights are real (0 or 1).
                const magnitudes = coefficients.map(h => this.getMagnitude(h));
                const maxIndex = magnitudes.indexOf(Math.max(...magnitudes));
                return coefficients.map((_, i) => (i === maxIndex ? 1 : 0));

            case 'MRC':
                // Maximal-Ratio Combining: Weight is proportional to |h_i|^2 (real-valued weights)
                const totalPower = coefficients.reduce((sum, h) => sum + this.getMagnitude(h) ** 2, 0);
                if (totalPower === 0) return coefficients.map(() => 0);
                return coefficients.map(h => {
                    const power = this.getMagnitude(h) ** 2;
                    return power / totalPower;
                });

            default:
                throw new Error('Invalid combining method');
        }
    }

    /**
     * MODIFIED: Displays complex coefficients and weights in a table.
     */
    displayCoefficients(coefficients, weights) {
        const container = document.getElementById('table-container');
        container.style.display = 'block';
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">Antenna</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Channel Coeff. (h)</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Weight (w)</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Combined Gain |h*w|</th>
                    </tr>
                </thead>
                <tbody>
                    ${coefficients.map((coeff, i) => {
                        const weight = weights[i];
                        const combinedProduct = this.multiplyComplex(coeff, weight);
                        const gain = this.getMagnitude(combinedProduct);
                        return `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${i + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${this.formatComplex(coeff, 3)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${this.formatComplex(weight, 3)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${this.formatComplex(combinedProduct, 3)}</td>
                        </tr>
                        `}).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * MODIFIED: Renders the diagram with improved spacing and layout to prevent antenna cutoff.
     */
    renderDiagram(systemType, numAntennas, coefficients, weights) {
        this.svg.selectAll('*').remove();
        this.setupAntennaSymbols();

        const width = 800;
        const minHeight = 400; // Minimum height
        const antennaSpacing = 80; // Space needed per antenna
        const topBottomPadding = 100; // Padding for top and bottom
        const height = Math.max(minHeight, numAntennas * antennaSpacing + topBottomPadding);
        
        // Update SVG height and viewBox to ensure proper scaling
        this.svg.attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');
        
        const centerX = width / 4;
        const centerY = height / 2;
        const antennaSize = 50;
        const verticalSpacing = Math.min(70, Math.max(50, (height - topBottomPadding) / Math.max(numAntennas - 1, 1)));
        const gap = 20;

        const rightX = width * 0.55; // Moved further left to accommodate labels
        const startY = centerY - ((numAntennas - 1) * verticalSpacing) / 2;

        if (systemType === 'SIMO') {
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

                const labelOffset = 3.75;
                const labelX = (centerX + rightX) / 2;
                const labelY = (centerY + y) / 2 - labelOffset;
                const angle = Math.atan2(y - centerY, rightX - centerX) * (180 / Math.PI);
                const adjustedAngle = angle < -90 || angle > 90 ? angle + 180 : angle;

                this.svg.append('text')
                    .attr('class', 'coefficient-label')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--secondary-color)')
                    .attr('font-size', '12px')
                    .attr('transform', `rotate(${adjustedAngle}, ${labelX}, ${labelY})`)
                    .text(`h${i + 1}: ${this.formatComplex(coefficients[i], 2)}`);

                // Position weight labels with better spacing
                this.svg.append('text')
                    .attr('class', 'weight-label')
                    .attr('x', rightX + antennaSize / 2 + 70) // Increased offset
                    .attr('y', y + 5) // Slight vertical offset for better alignment
                    .attr('font-size', '12px')
                    .text(`W${i + 1}: ${this.formatComplex(weights[i], 2)}`);

                this.svg.append('use')
                    .attr('href', '#receiver')
                    .attr('class', 'antenna-image')
                    .attr('x', rightX - antennaSize / 2)
                    .attr('y', y - antennaSize / 2)
                    .attr('width', antennaSize)
                    .attr('height', antennaSize);
            }
        } else if (systemType === 'MISO') {
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
                    .attr('marker-end', `url(#arrowhead)`);

                const labelOffset = 3.75;
                const labelX = (centerX + rightX) / 2;
                const labelY = (centerY + y) / 2 - labelOffset;
                const angle = Math.atan2(centerY - y, centerX - rightX) * (180 / Math.PI);
                const adjustedAngle = angle < -90 || angle > 90 ? angle + 180 : angle;

                this.svg.append('text')
                    .attr('class', 'coefficient-label')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--secondary-color)')
                    .attr('font-size', '12px')
                    .attr('transform', `rotate(${adjustedAngle}, ${labelX}, ${labelY})`)
                    .text(`h${i + 1}: ${this.formatComplex(coefficients[i], 2)}`);

                // Position weight labels with better spacing
                this.svg.append('text')
                    .attr('class', 'weight-label')
                    .attr('x', rightX + antennaSize / 2 + 70) // Increased offset
                    .attr('y', y + 5) // Slight vertical offset for better alignment
                    .attr('font-size', '12px')
                    .text(`W${i + 1}: ${this.formatComplex(weights[i], 2)}`);

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

// Ensure the rest of your JS file remains the same
document.addEventListener('DOMContentLoaded', () => {
    const antennaSystem = new AntennaSystem();
});

// ------------------------------------------ On startup ----------------------------------------------------------