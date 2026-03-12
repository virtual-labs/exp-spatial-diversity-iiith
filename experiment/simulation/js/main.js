// Wait for the main document to be fully loaded before executing scripts
// MODIFIED: document.addEventListener('DOMContentLoaded', ...)
// Global variables for quantitative metrics
let lastChannelCoefficients = [];
let lastNoisePowers = [];
let lastCombinedSNR = null;
let lastOutputSNR = null;
let lastDiversityGain = null;
let baselineSNR = null;


document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main application class
    new AntennaSystem();

    // Set up the tab switching functionality
    const defaultTab = document.getElementById("default");
    if (defaultTab) {
        defaultTab.click(); // This will trigger openPart and highlight sim-step-1
    } else {
        // Fallback if click doesn't work for some reason
        highlightInstruction('sim-step-1');
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

    // ADDED: Reset instructions based on active tab
    if (tabName === 'Simulation') {
        highlightInstruction('sim-step-1');
    } else {
        highlightInstruction('perf-step-1');
    }
}

// ADDED: Helper function to highlight instructions
function highlightInstruction(stepId) {
    // List of all possible steps to clear
    const allSteps = [
        'sim-step-1', 'sim-step-2', 'sim-step-3', 'sim-step-4', 'sim-step-5',
        'perf-step-1', 'perf-step-2', 'perf-step-3', 'perf-step-4'
    ];
    
    allSteps.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('active-instruction');
    });

    // Add active class to target step
    const target = document.getElementById(stepId);
    if (target) {
        target.classList.add('active-instruction');
    }
}

function displayQuantitativeMetrics() {
    const metricsContainer = document.getElementById('metrics-container');
    if (!metricsContainer) return;
    
    const combiningMethod = document.getElementById('combining-method').value;
    const numAntennas = lastChannelCoefficients.length;
    const avgSNR = parseFloat(document.getElementById('avg-snr').value);
    
    // Calculate combining efficiency
    const avgSNRLinear = Math.pow(10, avgSNR / 10);
    const channelGains = lastChannelCoefficients.map(h => {
        const magnitude = Math.sqrt(h.real * h.real + h.imag * h.imag);
        return magnitude * magnitude;
    });
    const theoreticalMRC_SNR = channelGains.reduce((sum, gain) => sum + gain, 0) * avgSNRLinear;
    const combiningEfficiency = (lastCombinedSNR / theoreticalMRC_SNR) * 100;
    
    metricsContainer.innerHTML = `
        <h4 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">
            Performance Metrics
        </h4>
        
        <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #16a34a;">
            <h5 style="color: #166534; margin: 0 0 10px 0; font-size: 0.95rem;">Combined Output Performance</h5>
            <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Output SNR (γ<sub>out</sub>):</strong> 
                <span style="color: #16a34a; font-size: 1.1rem; font-weight: 600;">${lastOutputSNR.toFixed(2)} dB</span>
            </p>
            <p style="margin: 4px 0; font-size: 0.85rem; color: #666;">
                Linear: ${lastCombinedSNR.toFixed(4)}
            </p>
        </div>
        
        <div style="background: #f3e8ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #7c3aed;">
            <h5 style="color: #6b21a8; margin: 0 0 10px 0; font-size: 0.95rem;">Diversity Performance</h5>
            <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Diversity Gain (G<sub>d</sub>):</strong> 
                <span style="color: #7c3aed; font-size: 1.1rem; font-weight: 600;">${lastDiversityGain.toFixed(2)} dB</span>
            </p>
            <p style="margin: 4px 0; font-size: 0.8rem; color: #666;">
                Improvement over a single reference antenna (Antenna 1)
            </p>
            <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Combining Efficiency:</strong> ${combiningEfficiency.toFixed(1)}%</p>
            <p style="margin: 4px 0; font-size: 0.8rem; color: #666;">
                ${combiningMethod === 'MRC' ? 'MRC achieves 100% efficiency (optimal)' : 
                  combiningMethod === 'EGC' ? `EGC achieves ${combiningEfficiency.toFixed(1)}% of MRC performance` : 
                  `SC achieves ${combiningEfficiency.toFixed(1)}% of MRC performance`}
            </p>
        </div>
        
        <div style="background: #fee2e2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h5 style="color: #991b1b; margin: 0 0 10px 0; font-size: 0.95rem;">Theoretical Analysis</h5>
            <p style="margin: 4px 0; font-size: 0.85rem;"><strong>Expected BER Improvement:</strong> 
                ~${Math.pow(10, lastDiversityGain / 10).toFixed(1)}× better than single antenna
            </p>
            <p style="margin: 4px 0; font-size: 0.85rem;"><strong>Optimal SNR (MRC with these channels):</strong> 
                ${(10 * Math.log10(theoreticalMRC_SNR)).toFixed(2)} dB
            </p>
            <p style="margin: 4px 0; font-size: 0.85rem;"><strong>SNR Loss from Optimal:</strong> 
                ${(10 * Math.log10(theoreticalMRC_SNR) - lastOutputSNR).toFixed(2)} dB
            </p>
        </div>
    `;
}

function addBERFormulas() {
    const metricsContainer = document.getElementById('metrics-container');
    const combiningMethod = document.getElementById('combining-method').value;
    const numAntennas = lastChannelCoefficients.length;
    
    const formulas = {
        'MRC': `P<sub>e</sub> ≈ (1/2)<sup>${numAntennas}</sup> × (1/(1+γ<sub>avg</sub>))<sup>${numAntennas}</sup>`,
        'EGC': `P<sub>e</sub> ≈ Complex function of N and γ<sub>avg</sub> (sub-optimal)`,
        'SC': `P<sub>e</sub> ≈ [Q(√(2γ<sub>avg</sub>))]<sup>${numAntennas}</sup>`
    };
    
    const berSection = `
        <div style="background: #fef9c3; padding: 10px; border-radius: 8px; margin-top: 12px; border-left: 4px solid #eab308;">
            <h5 style="color: #854d0e; margin: 0 0 8px 0; font-size: 0.9rem;">Theoretical BER Formula</h5>
            <p style="margin: 4px 0; font-size: 0.85rem;">${formulas[combiningMethod]}</p>
            <p style="margin: 4px 0; font-size: 0.75rem; color: #666;">
                For BPSK modulation with ${combiningMethod} and ${numAntennas} antennas
            </p>
        </div>
    `;
    
    metricsContainer.innerHTML += berSection;
}

function displayComparativeAnalysis() {
    const tableContainer = document.getElementById('table-container');
    if (!tableContainer || !lastChannelCoefficients.length) return;
    
    const avgSNR = parseFloat(document.getElementById('avg-snr').value);
    const avgSNRLinear = Math.pow(10, avgSNR / 10);
    const numAntennas = lastChannelCoefficients.length;
    
    // Helper function to get magnitude from complex number
    const getMagnitude = (h) => Math.sqrt(h.real * h.real + h.imag * h.imag);
    
    // Calculate SNR for all combining methods
    const results = {};
    
    // MRC
    const mrcSNR = lastChannelCoefficients.reduce((sum, h) => {
        const magnitude = getMagnitude(h);
        return sum + avgSNRLinear * magnitude * magnitude;
    }, 0);
    
    // FIX: Baseline is the instantaneous SNR of Antenna 1
    const baselineSingleAntenna = avgSNRLinear * Math.pow(getMagnitude(lastChannelCoefficients[0]), 2);
    
    results.MRC = {
        snrLinear: mrcSNR,
        snrDB: 10 * Math.log10(mrcSNR),
        gain: 10 * Math.log10(mrcSNR / baselineSingleAntenna)
    };
    
    // EGC
    const sumMagnitudes = lastChannelCoefficients.reduce((sum, h) => sum + getMagnitude(h), 0);
    const egcSNR = avgSNRLinear * Math.pow(sumMagnitudes, 2) / numAntennas;
    results.EGC = {
        snrLinear: egcSNR,
        snrDB: 10 * Math.log10(egcSNR),
        gain: 10 * Math.log10(egcSNR / baselineSingleAntenna)
    };
    
    // SC
    const maxBranchSNR = Math.max(...lastChannelCoefficients.map(h => {
        const magnitude = getMagnitude(h);
        return avgSNRLinear * magnitude * magnitude;
    }));
    results.SC = {
        snrLinear: maxBranchSNR,
        snrDB: 10 * Math.log10(maxBranchSNR),
        gain: 10 * Math.log10(maxBranchSNR / baselineSingleAntenna)
    };
    
    // Single Antenna (baseline) - CORRECTED
    results.Single = {
        snrLinear: baselineSingleAntenna,
        snrDB: 10 * Math.log10(baselineSingleAntenna),
        gain: 0
    };
    
    // Determine which method is currently selected
    const currentMethod = document.getElementById('combining-method').value;
    const isCurrentMethod = (method) => {
        const tolerance = 0.01; // Small tolerance for floating point comparison
        return Math.abs(lastCombinedSNR - results[method].snrLinear) < tolerance;
    };
    
    tableContainer.innerHTML = `
        <h5 style="color: #1e40af; margin: 15px 0 10px 0; font-size: 0.95rem;">
            Comparative Performance Analysis
        </h5>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #e0e7ff;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Method</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Output SNR (dB)</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Diversity Gain (dB)</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Relative BER</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background-color: ${isCurrentMethod('MRC') ? '#dcfce7' : '#fff'};">
                        <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>MRC</strong> (Optimal)</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 600; color: #16a34a;">
                            ${results.MRC.snrDB.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${results.MRC.gain.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            1.00×
                        </td>
                    </tr>
                    <tr style="background-color: ${isCurrentMethod('EGC') ? '#dcfce7' : '#f8fafc'};">
                        <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>EGC</strong> (Sub-optimal)</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 600; color: #2563eb;">
                            ${results.EGC.snrDB.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${results.EGC.gain.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${(Math.pow(10, (results.MRC.snrDB - results.EGC.snrDB) / 10)).toFixed(2)}×
                        </td>
                    </tr>
                    <tr style="background-color: ${isCurrentMethod('SC') ? '#dcfce7' : '#fff'};">
                        <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>SC</strong> (Selection)</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 600; color: #7c3aed;">
                            ${results.SC.snrDB.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${results.SC.gain.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${(Math.pow(10, (results.MRC.snrDB - results.SC.snrDB) / 10)).toFixed(2)}×
                        </td>
                    </tr>
                    <tr style="background-color: #fef3c7;">
                        <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>Single Antenna</strong> (Baseline)</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 600; color: #dc2626;">
                            ${results.Single.snrDB.toFixed(2)}
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            0.00
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
                            ${(Math.pow(10, (results.MRC.snrDB - results.Single.snrDB) / 10)).toFixed(2)}×
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="font-size: 0.75rem; color: #666; margin-top: 8px; font-style: italic;">
            * Relative BER shows how much worse the error rate is compared to MRC (1.00× = same as MRC, 2× = twice as many errors)
        </p>
        <p style="font-size: 0.75rem; color: #666; margin-top: 4px; font-style: italic;">
            * Currently selected method is highlighted in green
        </p>
    `;
}

function displaySystemConfiguration() {
    const systemType = document.getElementById('system-type').value;
    const numAntennas = parseInt(document.getElementById('num-antennas').value, 10);
    const combiningMethod = document.getElementById('combining-method').value;
    const avgSNR = parseFloat(document.getElementById('avg-snr').value);
    
    const methodNames = {
        'MRC': 'Maximal Ratio Combining',
        'EGC': 'Equal Gain Combining',
        'SC': 'Selection Combining'
    };
    
    // Find the form element and add config display after it
    const form = document.getElementById('system-form');
    
    // Remove existing config display if it exists
    const existingConfig = document.getElementById('current-config-display');
    if (existingConfig) {
        existingConfig.remove();
    }
    
    // Create new config display
    const configDiv = document.createElement('div');
    configDiv.id = 'current-config-display';
    configDiv.innerHTML = `
        <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2563eb;">
            <h5 style="color: #1e40af; margin: 0 0 8px 0; font-size: 0.9rem;">Current Configuration</h5>
            <p style="margin: 3px 0; font-size: 0.85rem;"><strong>System:</strong> ${systemType} (${numAntennas} antennas)</p>
            <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Method:</strong> ${methodNames[combiningMethod]}</p>
            <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Avg SNR:</strong> ${avgSNR.toFixed(2)} dB</p>
        </div>
    `;
    
    form.parentNode.insertBefore(configDiv, form.nextSibling);
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
            // ADDED: Highlight Step 3 (Action)
            highlightInstruction('sim-step-3');

            this.applyDiversity();
            generateButton.style.display = 'none';
            applyDiversityButton.style.display = 'block';
            resetButton.style.display = 'block';

            // ADDED: Move to Step 4 (Combining Method) after generation
            setTimeout(() => highlightInstruction('sim-step-4'), 500);
        });

        // The "Apply" button also calls the main update function
        applyDiversityButton.addEventListener('click', () => {
             this.applyDiversity();
             highlightInstruction('sim-step-4');
        });

        // The reset logic remains the same
        resetButton.addEventListener('click', () => {
            highlightInstruction('sim-step-5');

            this.svg.selectAll('*').remove();
            this.coefficients = [];
            generateButton.style.display = 'block';
            applyDiversityButton.style.display = 'none';
            resetButton.style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            document.getElementById('table-container').innerHTML = '';
            document.getElementById('metrics-container').innerHTML = '';
            
            // ADD THIS LINE:
            const existingConfig = document.getElementById('current-config-display');
            if (existingConfig) existingConfig.remove();
            
            lastChannelCoefficients = [];
            lastNoisePowers = [];
            lastCombinedSNR = null;
            lastOutputSNR = null;
            lastDiversityGain = null;
            baselineSNR = null;

            setTimeout(() => highlightInstruction('sim-step-1'), 1000);
        });

        // Performance Tab Listener
        document.getElementById('generate-plot-button').addEventListener('click', () => this.runMonteCarloAndPlot());

        // ADD THIS NEW LISTENER:
        // Combining Method Change Listener
        document.getElementById('combining-method').addEventListener('change', () => {
            if (lastChannelCoefficients.length > 0) {
                this.applyDiversity();
            }
        });

        // ADDED: Input Listeners for Simulation Tab
        // Step 1: System Config
        ['system-type', 'num-antennas'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', () => highlightInstruction('sim-step-1'));
        });

        // Step 2: SNR
        const avgSnr = document.getElementById('avg-snr');
        if(avgSnr) {
            avgSnr.addEventListener('input', () => highlightInstruction('sim-step-2'));
            avgSnr.addEventListener('focus', () => highlightInstruction('sim-step-2'));
        }
        
        // Step 4: Combining Method (highlight when user interacts with it)
        const comboMethod = document.getElementById('combining-method');
        if(comboMethod) comboMethod.addEventListener('change', () => highlightInstruction('sim-step-4'));

        // ADDED: Input Listeners for Performance Tab
        // Step 1: Num Antennas
        const plotAntennas = document.getElementById('plot-num-antennas');
        if(plotAntennas) plotAntennas.addEventListener('input', () => highlightInstruction('perf-step-1'));

        // Step 2: Threshold
        const snrThresh = document.getElementById('snr-threshold');
        if(snrThresh) snrThresh.addEventListener('input', () => highlightInstruction('perf-step-2'));

        // Step 3: Trials
        const trials = document.getElementById('num-trials');
        if(trials) trials.addEventListener('change', () => highlightInstruction('perf-step-3'));
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
        
        if (isNaN(numAntennas) || numAntennas < 1 || numAntennas > 8) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Please enter a valid number of antennas (1-8).';
            errorMessage.style.display = 'block';
            return;
        }
        document.getElementById('error-message').style.display = 'none';

        // Display system configuration in controls
        displaySystemConfiguration();

        if (this.coefficients.length !== numAntennas) {
            this.coefficients = this.generateRayleighCoefficients(numAntennas);
        }

        const combiningMethod = document.getElementById('combining-method').value;
        const systemType = document.getElementById('system-type').value;
        const avgSnr_db = parseFloat(document.getElementById('avg-snr').value);

        const weights = this.calculateWeights(this.coefficients, combiningMethod);
        const metrics = this.calculateMetrics(this.coefficients, this.dbToLinear(avgSnr_db));
        
        // CHANGED ORDER: Table first, then metrics, then comparison
        this.displayCoefficientsTable(this.coefficients, weights, metrics.individualSNRs);
        displayQuantitativeMetrics();
        displayComparativeAnalysis();
        addBERFormulas();
        
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
        
        // CORRECTED FIX: Use the instantaneous SNR of Antenna 1 as the baseline
        // This ensures the gain compares the array against a single physical antenna
        // in the exact same fading realization, guaranteeing >= 0 dB gain for MRC.
        baselineSNR = individualSNRs[0];  

        // Calculate diversity gain compared to Antenna 1
        lastDiversityGain = 10 * Math.log10(combinedSNR_linear / baselineSNR);

        // Store values for display
        lastChannelCoefficients = coefficients;
        lastCombinedSNR = combinedSNR_linear;
        lastOutputSNR = 10 * Math.log10(combinedSNR_linear);
        
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
        const yAxisLabel = g.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 20)
            .attr('x', -height / 2);

        yAxisLabel.append('tspan').text('Outage Probability (P');
        yAxisLabel.append('tspan')
            .attr('baseline-shift', 'sub')
            .attr('font-size', '0.8em')
            .text('out');
        yAxisLabel.append('tspan').text(')');        
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