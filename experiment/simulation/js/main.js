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

function startup() {
    if (document.getElementById("default")) {
        document.getElementById("default").click();
    }
}

window.onload = startup;


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

    dbmToLinear(dbm) { return Math.pow(10, dbm / 10); }
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
        // If the number is real (or very close to it), just show the magnitude.
        if (Math.abs(c.imag) < 1e-9 || Math.abs(polar.phase) < 1e-9) {
            return (c.real !== undefined ? c.real : polar.magnitude).toFixed(precision);
        }
        return `${polar.magnitude.toFixed(precision)}e<sup>j${polar.phase.toFixed(precision)}</sup>`;
    }

    _renderComplexWithSuperscript(selection, prefix, c, precision = 2) {
        const polar = this.getPolar(c);
        selection.text(prefix ? `${prefix} ` : '');
        // If the number is real, don't show the exponent part.
        if (Math.abs(c.imag) < 1e-9 || Math.abs(polar.phase) < 1e-9) {
            selection.append('tspan').text((c.real !== undefined ? c.real : polar.magnitude).toFixed(precision));
            return;
        }
        selection.append('tspan').text(`${polar.magnitude.toFixed(precision)}e`);
        selection.append('tspan')
            .attr('dy', '-0.5em').attr('font-size', '0.8em')
            .text(`j${polar.phase.toFixed(precision)}`);
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
        // Simulation Tab Listeners
        const generateButton = document.getElementById('generate-diagram');
        const applyDiversityButton = document.getElementById('apply-diversity');
        const resetButton = document.getElementById('reset-experiment');
        
        generateButton.addEventListener('click', () => {
            this.generateSystemDiagram();
            generateButton.style.display = 'none';
            applyDiversityButton.style.display = 'block';
            resetButton.style.display = 'block';
        });

        applyDiversityButton.addEventListener('click', () => this.applyDiversity());
        
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
        if (this.coefficients.length === 0) {
            this.generateSystemDiagram();
            return;
        }

        const combiningMethod = document.getElementById('combining-method').value;
        const systemType = document.getElementById('system-type').value;
        const numAntennas = this.coefficients.length;
        const Pt_dbm = parseFloat(document.getElementById('transmit-power').value);
        const N0_dbm = parseFloat(document.getElementById('noise-power').value);

        const weights = this.calculateWeights(this.coefficients, combiningMethod);
        const metrics = this.calculateMetrics(this.coefficients, combiningMethod, this.dbmToLinear(Pt_dbm), this.dbmToLinear(N0_dbm));
        
        this.displayMetrics(metrics);
        this.displayCoefficientsTable(this.coefficients, weights);
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

    // Replace the calculateWeights method with this corrected version:
    calculateWeights(coefficients, method) {
        switch (method) {
            case 'MRC':
                // For MRC, the weight is the complex conjugate of the channel coefficient.
                // This co-phases the signal AND weights it by its magnitude.
                return coefficients.map(h => this.conjugate(h));
            
            case 'EGC':
                // For EGC, the weight is the conjugate of the normalized channel.
                // This ONLY co-phases the signal, giving each an equal gain of 1.
                return coefficients.map(h => {
                    const magnitude = this.getMagnitude(h);
                    if (magnitude === 0) return { real: 1, imag: 0 }; // Avoid division by zero
                    // Normalize to get the unit phase vector, then conjugate it.
                    const normalized = { real: h.real / magnitude, imag: h.imag / magnitude };
                    return this.conjugate(normalized);
                });

            case 'SC':
                // For SC, only select the branch with highest gain, apply co-phasing to that branch
                const magnitudes = coefficients.map(h => this.getMagnitude(h));
                const maxIndex = magnitudes.indexOf(Math.max(...magnitudes));
                return coefficients.map((h, i) => {
                    if (i === maxIndex) {
                        // Apply co-phasing to the selected branch
                        const magnitude = this.getMagnitude(h);
                        if (magnitude === 0) return { real: 1, imag: 0 };
                        const normalized = { real: h.real / magnitude, imag: h.imag / magnitude };
                        return this.conjugate(normalized);
                    } else {
                        return { real: 0, imag: 0 }; // Zero weight for non-selected branches
                    }
                });

            default: 
                throw new Error('Invalid combining method');
        }
    }

    // Also replace the calculateMetrics method with this corrected version:
    calculateMetrics(coefficients, combiningMethod, Pt_linear, N0_linear) {
        const N = coefficients.length;
        const weights = this.calculateWeights(coefficients, combiningMethod);
        
        let combinedSNR_linear = 0;
        
        switch (combiningMethod) {
            case 'MRC':
                // For MRC: SNR = (Pt/N0) * sum(|h_i|^2)
                const sumSquaredMagnitudes = coefficients.reduce((sum, h) => 
                    sum + (this.getMagnitude(h) ** 2), 0);
                combinedSNR_linear = (Pt_linear / N0_linear) * sumSquaredMagnitudes;
                break;
                
            case 'SC':
                // For SC: SNR = (Pt/N0) * max(|h_i|^2)
                const maxSquaredMagnitude = Math.max(...coefficients.map(h => 
                    this.getMagnitude(h) ** 2));
                combinedSNR_linear = (Pt_linear / N0_linear) * maxSquaredMagnitude;
                break;
                
            case 'EGC':
                // For EGC: SNR = (Pt/N0) * (sum(|h_i|))^2 / N
                const sumMagnitudes = coefficients.reduce((sum, h) => 
                    sum + this.getMagnitude(h), 0);
                combinedSNR_linear = (Pt_linear / N0_linear) * (sumMagnitudes ** 2) / N;
                break;
        }

        // Calculate sum capacity (individual branch capacities)
        const channelGains = coefficients.map(h => this.getMagnitude(h) ** 2);
        const snrs_linear = channelGains.map(gain => Pt_linear * gain / N0_linear);
        const sumCapacity = snrs_linear.reduce((sum, snr) => sum + Math.log2(1 + snr), 0);
        
        return { combinedSNR_linear, sumCapacity };
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

    displayCoefficientsTable(coefficients, weights) {
        const container = document.getElementById('table-container');
        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Antenna</th>
                        <th>Channel (h)</th>
                        <th>Co-phasing Weight (w)</th>
                        <th>Gain after Co-phasing (h*w)</th>
                    </tr>
                </thead>
                <tbody>`;

        coefficients.forEach((coeff, i) => {
            const weight = weights[i];
            const combinedProduct = this.multiplyComplex(coeff, weight);
            tableHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${this.formatComplexForTable(coeff, 3)}</td>
                    <td>${this.formatComplexForTable(weight, 3)}</td>
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

                const snrThreshold_linear = this.dbmToLinear(snrThreshold_db);
                const snrDbRange = Array.from({ length: 21 }, (_, i) => i); // 0 to 20 dB
                
                const plotData = snrDbRange.map(snrDb => {
                    const avgSnr_linear = this.dbmToLinear(snrDb);
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
        }, 50); // Use setTimeout to allow UI to update before heavy calculation
    }
    
    renderPoutPlot(data) {
        this.plotSvg.selectAll('*').remove();
        const container = document.getElementById('plot-container');
        const margin = { top: 20, right: 100, bottom: 50, left: 70 };
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
}

document.addEventListener('DOMContentLoaded', () => {
    new AntennaSystem();
});