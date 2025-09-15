// Wait for the main document to be fully loaded before executing scripts
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main application class
    new AntennaSystem();

    // Set up the tab switching functionality
    const defaultTab = document.getElementById("default");
    if (defaultTab) {
        defaultTab.click();
    }
});

/**
 * Handles tab switching for the main interface.
 * @param {Event} evt - The click event.
 * @param {string} tabName - The ID of the tab content to show.
 */
function openPart(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}


class AntennaSystem {
    constructor() {
        this.svg = d3.select('#diagram');
        this.plotSvg = d3.select('#pout-plot');
        this.coefficients = [];
        this.setupEventListeners();
        this.setupAntennaSymbols();
    }

    // -------------------------------------------------------------------
    // SECTION: Helper Methods (Complex Numbers, Formatting, etc.)
    // -------------------------------------------------------------------

    dbToLinear(db) { return Math.pow(10, db / 10); }
    linearToDb(linear) { return 10 * Math.log10(linear); }
    
    getMagnitude(c) {
        if (typeof c === 'number') return Math.abs(c);
        return Math.sqrt(c.real ** 2 + c.imag ** 2);
    }

    getPolar(c) {
        if (typeof c === 'number') return { magnitude: c, phase: c < 0 ? Math.PI : 0 };
        const magnitude = this.getMagnitude(c);
        const phase = Math.atan2(c.imag, c.real);
        return { magnitude, phase };
    }

    multiplyComplex(c1, c2) {
        const val1 = (typeof c1 === 'number') ? { real: c1, imag: 0 } : c1;
        const val2 = (typeof c2 === 'number') ? { real: c2, imag: 0 } : c2;
        const real = val1.real * val2.real - val1.imag * val2.imag;
        const imag = val1.real * val2.imag + val1.imag * val2.real;
        return { real, imag };
    }

    conjugate(c) {
        if (typeof c === 'number') return { real: c, imag: 0 };
        return { real: c.real, imag: -c.imag };
    }

    formatComplexForTable(c, precision = 3) {
        const polar = this.getPolar(c);
        if (Math.abs(c.imag) < 1e-9) {
            return (c.real !== undefined ? c.real : polar.magnitude).toFixed(precision);
        }
        const mag = polar.magnitude.toFixed(precision);
        const phase = Math.abs(polar.phase).toFixed(precision);
        const sign = polar.phase < 0 ? '-' : '';
        return `${mag}e<sup>${sign}j${phase}</sup>`;
    }

    _renderComplexWithSuperscript(selection, prefix, c, precision = 2) {
        const polar = this.getPolar(c);
        selection.text(prefix ? `${prefix} ` : '');
        if (Math.abs(c.imag) < 1e-9) {
            selection.append('tspan').text((c.real !== undefined ? c.real : polar.magnitude).toFixed(precision));
            return;
        }
        selection.append('tspan').text(`${polar.magnitude.toFixed(precision)}e`);
        const phaseVal = Math.abs(polar.phase).toFixed(precision);
        const sign = polar.phase < 0 ? '-' : '';
        selection.append('tspan')
            .attr('dy', '-0.5em').attr('font-size', '0.8em')
            .text(`${sign}j${phaseVal}`);
    }


    // -------------------------------------------------------------------
    // SECTION: Core Simulation Logic & Event Handling
    // -------------------------------------------------------------------

    setupAntennaSymbols() {
        const defs = this.svg.append('defs');
        defs.append('symbol').attr('id', 'transmitter').attr('viewBox', '0 0 100 100').append('image').attr('href', './images/antenna-small.svg').attr('width', '100').attr('height', '100');
        defs.append('symbol').attr('id', 'receiver').attr('viewBox', '0 0 100 100').append('image').attr('href', './images/antenna-small.svg').attr('width', '100').attr('height', '100');
        defs.append('marker').attr('id', 'arrowhead').attr('viewBox', '0 0 10 10').attr('refX', 10).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto').append('path').attr('d', 'M 0 0 L 10 5 L 0 10 Z').attr('fill', 'var(--secondary-color)');
    }

    setupEventListeners() {
        const generateButton = document.getElementById('generate-diagram');
        const applyDiversityButton = document.getElementById('apply-diversity');
        const resetButton = document.getElementById('reset-experiment');

        // Make the "Generate" button call the main update function
        generateButton.addEventListener('click', () => {
            this.applyDiversity();
            generateButton.style.display = 'none';
            applyDiversityButton.style.display = 'block';
            resetButton.style.display = 'block';
        });

        // The "Apply" button also calls the main update function
        applyDiversityButton.addEventListener('click', () => this.applyDiversity());

        // The reset logic remains the same
        resetButton.addEventListener('click', () => {
            this.svg.selectAll('*').remove();
            this.coefficients = [];
            generateButton.style.display = 'block';
            applyDiversityButton.style.display = 'none';
            resetButton.style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            document.getElementById('table-container').innerHTML = '';
            document.getElementById('metrics-container').innerHTML = '';
        });

        // Performance Tab Listener
        document.getElementById('generate-plot-button').addEventListener('click', () => this.runMonteCarloAndPlot());
    }

    generateSystemDiagram() {
        const numAntennas = parseInt(document.getElementById('num-antennas').value, 10);
        if (isNaN(numAntennas) || numAntennas < 1 || numAntennas > 8) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Please enter a valid number of antennas (1-8).';
            errorMessage.style.display = 'block';
            return;
        }
        document.getElementById('error-message').style.display = 'none';
        this.coefficients = this.generateRayleighCoefficients(numAntennas);
        this.applyDiversity();
    }

    applyDiversity() {
        const numAntennas = parseInt(document.getElementById('num-antennas').value, 10);
        
        // Step 1: Validate the number of antennas input
        if (isNaN(numAntennas) || numAntennas < 1 || numAntennas > 8) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Please enter a valid number of antennas (1-8).';
            errorMessage.style.display = 'block';
            return;
        }
        document.getElementById('error-message').style.display = 'none';

        // Step 2: Regenerate channel coefficients if antenna count has changed or if it's the first run
        if (this.coefficients.length !== numAntennas) {
            this.coefficients = this.generateRayleighCoefficients(numAntennas);
        }

        // Step 3: Proceed with all calculations and rendering using the current values from the UI
        const combiningMethod = document.getElementById('combining-method').value;
        const systemType = document.getElementById('system-type').value;
        const avgSnr_db = parseFloat(document.getElementById('avg-snr').value);

        const weights = this.calculateWeights(this.coefficients, combiningMethod);
        const metrics = this.calculateMetrics(this.coefficients, this.dbToLinear(avgSnr_db));
        
        this.displayMetrics(metrics);
        this.displayCoefficientsTable(this.coefficients, weights, metrics.individualSNRs);
        this.renderDiagram(systemType, numAntennas, this.coefficients, weights);
    }
    
    generateRayleighCoefficients(numAntennas) {
        return Array.from({ length: numAntennas }, () => {
            const u1 = Math.random(), u2 = Math.random();
            const R = Math.sqrt(-2 * Math.log(u1));
            const theta = 2 * Math.PI * u2;
            const z1 = R * Math.cos(theta), z2 = R * Math.sin(theta);
            return { real: z1 / Math.sqrt(2), imag: z2 / Math.sqrt(2) };
        });
    }

    calculateWeights(coefficients, method) {
        switch (method) {
            case 'MRC':
                return coefficients.map(h => this.conjugate(h));
            
            case 'EGC':
                return coefficients.map(h => {
                    const magnitude = this.getMagnitude(h);
                    if (magnitude < 1e-9) return { real: 1, imag: 0 };
                    const normalized = { real: h.real / magnitude, imag: h.imag / magnitude };
                    return this.conjugate(normalized);
                });

            case 'SC':
                const magnitudes = coefficients.map(h => this.getMagnitude(h));
                const maxIndex = magnitudes.indexOf(Math.max(...magnitudes));
                return coefficients.map((h, i) => {
                    if (i === maxIndex) {
                        const magnitude = this.getMagnitude(h);
                        if (magnitude < 1e-9) return { real: 1, imag: 0 };
                        const normalized = { real: h.real / magnitude, imag: h.imag / magnitude };
                        return this.conjugate(normalized);
                    } else {
                        return { real: 0, imag: 0 };
                    }
                });
            default: 
                throw new Error('Invalid combining method');
        }
    }

    calculateMetrics(coefficients, avgSnr_linear) {
        const N = coefficients.length;
        const combiningMethod = document.getElementById('combining-method').value;
        
        const channelGains = coefficients.map(h => this.getMagnitude(h) ** 2);
        const individualSNRs = channelGains.map(gain => gain * avgSnr_linear);

        let combinedSNR_linear = 0;
        
        switch (combiningMethod) {
            case 'MRC':
                combinedSNR_linear = individualSNRs.reduce((sum, snr) => sum + snr, 0);
                break;
            case 'SC':
                combinedSNR_linear = Math.max(...individualSNRs);
                break;
            case 'EGC':
                const sumMagnitudes = coefficients.reduce((sum, h) => sum + this.getMagnitude(h), 0);
                combinedSNR_linear = (sumMagnitudes ** 2 / N) * avgSnr_linear;
                break;
        }

        const sumCapacity = individualSNRs.reduce((sum, snr) => sum + Math.log2(1 + snr), 0);
        
        return { combinedSNR_linear, sumCapacity, individualSNRs };
    }

    // -------------------------------------------------------------------
    // SECTION: Display and Rendering
    // -------------------------------------------------------------------

    displayMetrics({ combinedSNR_linear, sumCapacity }) {
        const container = document.getElementById('metrics-container');
        container.innerHTML = `
            <div class="metric-display">
                <strong>Combined SNR:</strong>
                <span>${this.linearToDb(combinedSNR_linear).toFixed(2)} dB</span>
            </div>
            <div class="metric-display">
                <strong>Capacity:</strong>
                <span>${sumCapacity.toFixed(2)} bps/Hz</span>
            </div>`;
    }

    displayCoefficientsTable(coefficients, weights, individualSNRs) {
        const container = document.getElementById('table-container');
        const combiningMethod = document.getElementById('combining-method').value;

        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Antenna</th>
                        <th>Channel (h)</th>
                        <th>Branch SNR (dB)</th>
                        <th>Weight (w)</th>
                        <th>Combined Gain (h*w)</th>
                    </tr>
                </thead>
                <tbody>`;

        coefficients.forEach((coeff, i) => {
            const weight = weights[i];
            const combinedProduct = this.multiplyComplex(coeff, weight);
            const branchSNR_dB = this.linearToDb(individualSNRs[i]);
            let weightStr;

            // --- MODIFICATION START ---
            // Special formatting for EGC unit-magnitude weights as requested
            if (combiningMethod === 'EGC' && Math.abs(this.getMagnitude(weight) - 1.0) < 1e-9) {
                const polar = this.getPolar(weight);
                const mag = "1.0"; // Use "1.0" specifically
                const phase = Math.abs(polar.phase).toFixed(3); // Keep original phase precision
                const sign = polar.phase < 0 ? '-' : '';
                weightStr = `${mag}e<sup>${sign}j${phase}</sup>`;
            } else if (combiningMethod === 'SC' && Math.abs(this.getMagnitude(weight)) < 1e-9) {
                weightStr = "0.0"; // Cleanly display zero for non-selected branches in SC
            } else {
                // Use the general formatting function for all other cases (MRC, etc.)
                weightStr = this.formatComplexForTable(weight, 3);
            }
            // --- MODIFICATION END ---

            tableHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${this.formatComplexForTable(coeff, 3)}</td>
                    <td>${branchSNR_dB.toFixed(2)}</td>
                    <td>${weightStr}</td>
                    <td>${this.formatComplexForTable(combinedProduct, 3)}</td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }
    
    renderDiagram(systemType, numAntennas, coefficients, weights) {
        this.svg.selectAll('*').remove();
        this.setupAntennaSymbols();

        const width = 800;
        const height = 600;
        this.svg.attr('viewBox', `0 0 ${width} ${height}`);

        const centerX = width / 4;
        const centerY = height / 2;
        const antennaSize = 50;
        const gap = 20;

        const drawableHeight = height - 120;
        const verticalSpacing = numAntennas > 1 ? drawableHeight / (numAntennas - 1) : 0;
        const rightX = width * 0.65;
        const startY = centerY - ((numAntennas - 1) * verticalSpacing) / 2;
        const isSIMO = systemType === 'SIMO';

        this.svg.append('use').attr('href', isSIMO ? '#transmitter' : '#receiver').attr('class', 'antenna-image').attr('x', centerX - antennaSize / 2).attr('y', centerY - antennaSize / 2).attr('width', antennaSize).attr('height', antennaSize);

        for (let i = 0; i < numAntennas; i++) {
            const y = startY + i * verticalSpacing;
            const line = { x1: isSIMO ? centerX + gap : rightX - gap, y1: isSIMO ? centerY : y, x2: isSIMO ? rightX - gap : centerX + gap, y2: isSIMO ? y : centerY };
            
            this.svg.append('line').attr('class', 'line').attr('x1', line.x1).attr('y1', line.y1).attr('x2', line.x2).attr('y2', line.y2).attr('marker-end', `url(#arrowhead)`);
            
            const labelAngle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * (180 / Math.PI);
            const textAngle = labelAngle > 90 || labelAngle < -90 ? labelAngle + 180 : labelAngle;
            
            const hLabel = this.svg.append('text').attr('class', 'coefficient-label').attr('x', (line.x1 + line.x2) / 2).attr('y', (line.y1 + line.y2) / 2 - 8).attr('text-anchor', 'middle').attr('transform', `rotate(${textAngle}, ${(line.x1 + line.x2) / 2}, ${(line.y1 + line.y2) / 2})`);
            this._renderComplexWithSuperscript(hLabel, `h${i+1}:`, coefficients[i], 2);

            const labelRightX = rightX + antennaSize / 2 + 85;
            const wLabel = this.svg.append('text').attr('class', 'weight-label').attr('x', labelRightX).attr('y', y);
            this._renderComplexWithSuperscript(wLabel, `W${i+1}:`, weights[i], 2);
            
            this.svg.append('use').attr('href', isSIMO ? '#receiver' : '#transmitter').attr('class', 'antenna-image').attr('x', rightX - antennaSize / 2).attr('y', y - antennaSize / 2).attr('width', antennaSize).attr('height', antennaSize);
        }
    }

    // -------------------------------------------------------------------
    // SECTION: PERFORMANCE ANALYSIS AND PLOTTING
    // -------------------------------------------------------------------

    runMonteCarloAndPlot() {
        const statusDiv = document.getElementById('plot-status');
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '⚙️ Running simulation... This may take a moment.';

        setTimeout(() => {
            try {
                const N = parseInt(document.getElementById('plot-num-antennas').value, 10);
                const snrThreshold_db = parseFloat(document.getElementById('snr-threshold').value);
                const numTrials = parseInt(document.getElementById('num-trials').value, 10);
                
                if (isNaN(N) || isNaN(snrThreshold_db) || isNaN(numTrials) || N < 1 || numTrials < 1) {
                    throw new Error("Invalid plot inputs. Please check the values.");
                }

                const snrThreshold_linear = this.dbToLinear(snrThreshold_db);
                const snrDbRange = Array.from({ length: 21 }, (_, i) => i); // 0 to 20 dB
                
                const plotData = snrDbRange.map(snrDb => {
                    const avgSnr_linear = this.dbToLinear(snrDb);
                    let outageCounts = { mrc: 0, egc: 0, sc: 0 };

                    for (let i = 0; i < numTrials; i++) {
                        const h = this.generateRayleighCoefficients(N);
                        const channelGains = h.map(c => this.getMagnitude(c) ** 2);
                        const snrs = channelGains.map(g => g * avgSnr_linear);
                        
                        const mrcSnr = snrs.reduce((a, b) => a + b, 0);
                        if (mrcSnr < snrThreshold_linear) outageCounts.mrc++;
                        
                        const scSnr = Math.max(...snrs);
                        if (scSnr < snrThreshold_linear) outageCounts.sc++;
                        
                        const egcSignalMag = h.reduce((sum, c) => sum + this.getMagnitude(c), 0);
                        const egcSnr = (Math.pow(egcSignalMag, 2) / N) * avgSnr_linear;
                        if (egcSnr < snrThreshold_linear) outageCounts.egc++;
                    }

                    return {
                        snr: snrDb,
                        mrc: outageCounts.mrc / numTrials,
                        egc: outageCounts.egc / numTrials,
                        sc: outageCounts.sc / numTrials,
                    };
                });

                this.renderPoutPlot(plotData);
                statusDiv.className = 'alert alert-success mt-3';
                statusDiv.innerHTML = '✅ Plot generated successfully.';
            } catch (error) {
                statusDiv.className = 'alert alert-danger mt-3';
                statusDiv.innerHTML = `Error: ${error.message}`;
            }
        }, 50);
    }
    
    renderPoutPlot(data) {
        this.plotSvg.selectAll('*').remove();
        const container = document.getElementById('plot-container');
        const margin = { top: 40, right: 100, bottom: 50, left: 70 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;

        const g = this.plotSvg
            .attr('viewBox', `0 0 ${container.clientWidth} 450`)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
            
        const x = d3.scaleLinear().domain([0, 20]).range([0, width]);
        const y = d3.scaleLog().domain([1e-5, 1]).clamp(true).range([height, 0]);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5, ".0e"));
        
        g.append('text').attr('class', 'axis-label plot-title').attr('text-anchor', 'middle').attr('x', width / 2).attr('y', -margin.top + 20).text('Outage Probability vs. Average SNR');
        g.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('x', width / 2).attr('y', height + margin.bottom - 10).text('Average SNR per Branch (dB)');
        g.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('y', -margin.left + 20).attr('x', -height / 2).text('Outage Probability (P_out)');
        
        const colors = { mrc: '#d62728', egc: '#2ca02c', sc: '#1f77b4' };
        const labels = { mrc: 'MRC', egc: 'EGC', sc: 'SC' };

        ['mrc', 'egc', 'sc'].forEach((method, i) => {
            const line = d3.line().x(d => x(d.snr)).y(d => y(d[method] > 0 ? d[method] : 1e-6));
            g.append('path').datum(data).attr('fill', 'none').attr('stroke', colors[method]).attr('stroke-width', 2.5).attr('d', line);
            
            g.append('circle').attr('cx', width + 20).attr('cy', 20 + i * 25).attr('r', 6).style('fill', colors[method]);
            g.append('text').attr('x', width + 35).attr('y', 20 + i * 25).text(labels[method]).style('font-size', '15px').attr('alignment-baseline', 'middle');
        });
    }
<<<<<<< HEAD
}

document.addEventListener('DOMContentLoaded', () => {
    const antennaSystem = new AntennaSystem();
});

// ------------------------------------------ On startup ----------------------------------------------------------
=======
}
>>>>>>> d91dc208ce2cd93d74f3d8ca05c13411c3742294
