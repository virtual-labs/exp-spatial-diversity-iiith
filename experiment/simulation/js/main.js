

const imageMap = {
    "sc": "./images/SC.png",
    "mrc": "./images/MRC.png",
    "egc": "./images/EGC.png"
};


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
            .attr('href', './images/antenna-svgrepo-com.svg')
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

// ------------------------------------------ SIMO ----------------------------------------------------------

function simo() {
    // Retrieve values from input fields
    const Nr = parseInt(document.getElementById("Nr").value);
    const noiseVariance = parseFloat(document.getElementById("var").value);

    // Generate matrix H
    const H = generateMatrix(Nr, 1);

    // Get the selected combining type
    const combiningType = document.querySelector('input[name="combining-type"]:checked');

    let result;
    if (combiningType) {
        if (combiningType.id === 'sc') {
            // Calculate SC
            result = calculateSC(H, noiseVariance);
        } else if (combiningType.id === 'mrc') {
            // Calculate MRC
            result = calculateMRC(H, noiseVariance);
        } else if (combiningType.id === 'egc') {
            // Calculate EGC
            result = calculateEGC(H, noiseVariance, Nr);
        }

        // Display matrix H in the matrixContainer div
        const matrixContainer = document.getElementById("matrixContainer");
        displayMatrix(matrixContainer, H);
        matrixContainer.style.display = "block"; // Show matrix container

        // Display the result in Observations div
        const observationsDiv = document.getElementById("observations1");
        observationsDiv.innerHTML = `${combiningType.id.toUpperCase()}: ${result.toFixed(2)}`;
        observationsDiv.parentNode.style.display = "block"; // Show observations div

        
        // Show the Threshold input field and Outage button
        document.getElementById("outageInputContainer").style.display = "block";
        document.getElementById("outageButton").style.display = "block";

    }
}


// Variable to store the channel matrix
let channelMatrix;

// Function to handle "Get Channel" button click
function getChannel() {
    const Nr = parseInt(document.getElementById("Nr").value);
    const noiseVariance = parseFloat(document.getElementById("var").value);

    // Reset the channel matrix to null before generating the new matrix
    channelMatrix = null;

    // Generate matrix H only if it hasn't been generated before or if the button is clicked again
    channelMatrix = generateMatrix(Nr, 1);
    
    // Display matrix H in the matrixContainer div
    const matrixContainer = document.getElementById("matrixContainer");
    displayMatrix(matrixContainer, channelMatrix);
    matrixContainer.style.display = "block"; // Show matrix container

    // Show the radio buttons and threshold input
    document.getElementById("optionsContainer").style.display = "block";
}


// Function to handle "Calculate" button click
function calculate() {
    const Nr = parseInt(document.getElementById("Nr").value);
    const noiseVariance = parseFloat(document.getElementById("var").value);
    const combiningType = document.querySelector('input[name="combining-type"]:checked');
    const threshold = parseFloat(document.getElementById("threshold").value);


    let result;
    let outage;
    if (combiningType) {
        if (!channelMatrix) {
            // If channel matrix is not available, generate it
            channelMatrix = generateMatrix(Nr, 1);
        }

        if (combiningType.id === 'sc') {
            result = calculateSC(channelMatrix, noiseVariance);
            outage = calculateSCOutage(result,threshold, Nr);
        } else if (combiningType.id === 'mrc') {
            result = calculateMRC(channelMatrix, noiseVariance);
            outage = calculateMRCOutage(result, threshold,Nr);
        } else if (combiningType.id === 'egc') {
            result = calculateEGC(channelMatrix, noiseVariance, Nr);
            outage = calculateEGCOutage(result,threshold, Nr);
        }

        // Display the result and outage in Observations div
        const observationsDiv = document.getElementById("observations1");
        observationsDiv.innerHTML = `Combined SNR: ${result.toFixed(2)} <br> Outage Probability: ${outage.toFixed(4)}`;
        observationsDiv.parentNode.style.display = "block"; // Show observations div

        const imageDisplay = document.getElementById("imageDisplay");
        imageDisplay.src = imageMap[selectedCombiningType];
    }
}


    
// Function to calculate Selective Combining (SC)
function calculateSC(H, noiseVariance) {
    return H.reduce((sum, h, i) => sum + (Math.pow(h, 2) / noiseVariance) * (1 / (i + 1)), 0);
}

// Function to calculate Maximal Ratio Combining (MRC)
function calculateMRC(H, noiseVariance) {
    return H.reduce((sum, h) => sum + Math.pow(h, 2) / noiseVariance, 0);
}

// Function to calculate Equal Gain Combining (EGC)
function calculateEGC(H, noiseVariance, Nr) {
    const sum = H.reduce((sum, h) => sum + Math.pow(h, 2) / noiseVariance, 0);
    return (1 / Nr) * sum;
}

// Function to generate a matrix with random values
function generateMatrix(rows, cols) {
    var matrix = [];
    for (var i = 0; i < rows; i++) {
        matrix[i] = [];
        for (var j = 0; j < cols; j++) {
            matrix[i][j] = Math.random(); // You can adjust this to generate desired values
        }
    }
    return matrix;
}

// Function to display matrix in HTML table format
function displayMatrix(container, matrix) {
    container.innerHTML = ""; // Clear previous content

    // Create matrix label
    var matrixLabel = document.createElement("div");
    matrixLabel.textContent = "H = ";
    matrixLabel.style.fontWeight = "bold";
    matrixLabel.style.marginBottom = "10px";
    container.appendChild(matrixLabel);

    // Create matrix table
    var table = document.createElement("table");
    table.classList.add("matrix");
    for (var i = 0; i < matrix.length; i++) {
        var row = document.createElement("tr");
        for (var j = 0; j < matrix[i].length; j++) {
            var cell = document.createElement("td");
            cell.textContent = matrix[i][j].toFixed(2); // Display values rounded to 2 decimal places
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    container.appendChild(table); // Append the table to the container
}

// ------------------------------------------Outage Probability ----------------------------------------------------------



// Function to calculate outage probability
function calculateOutage() {
    const combiningType = document.querySelector('input[name="combining-type"]:checked');
    const threshold = parseFloat(document.getElementById("threshold").value);
    const result = parseFloat(document.getElementById("observations1").textContent.split(": ")[1]);
    const Nr = parseInt(document.getElementById("Nr").value);

    let outage;
    if (combiningType) {
        if (combiningType.id === 'sc') {
            outage = calculateSCOutage(result, threshold, Nr);
        } else if (combiningType.id === 'mrc') {
            outage = calculateMRCOutage(result, threshold, Nr);
        } else if (combiningType.id === 'egc') {
            outage = calculateEGCOutage(result, threshold, Nr);
        }

        const observationsDiv = document.getElementById("observations1");
        observationsDiv.innerHTML = `${combiningType.id.toUpperCase()}: ${result.toFixed(2)}<br>Outage: ${outage.toFixed(4)}`;
    }
}

// Helper functions for outage probability calculations
function calculateSCOutage(result, threshold, Nr) {
    return Math.pow(1 - Math.exp(-threshold / result), Nr);
}

function calculateMRCOutage(result, threshold, Nr) {
    let outage = Math.pow(1 - Math.exp(-threshold / result), Nr);
    for (let i = 1; i <= Nr; i++) {
        outage += (Math.pow(threshold / result, i - 1) / factorial(i - 1)) * Math.pow(1 - Math.exp(-threshold / result), Nr - i);
    }
    return outage;
}

function calculateEGCOutage(result, threshold, Nr) {
    const temp = result / (Nr * threshold);
    const Q = (x) => 0.5 * erfc(x / Math.sqrt(2));
    return Math.pow(1 - Math.exp(-2 * threshold / result), Nr) * (1 - 2 * Q(Math.sqrt(2 * temp)));
}

function factorial(n) {
    if (n === 0 || n === 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

function erfc(x) {
    // Complementary error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

    return x >= 0 ? y : 2 - y;
}





// ------------------------------------------ Image ----------------------------------------------------------
// Function to handle radio button change and update the image
function changeImage() {
    const radioButtons = document.querySelectorAll('input[name="combining-type"]:checked');
    if (radioButtons.length > 0) {
        selectedCombiningType = radioButtons[0].value; // Update selectedCombiningType
        const imageDisplay = document.getElementById("imageDisplay");
        imageDisplay.src = imageMap[selectedCombiningType]; // Set image src based on selectedCombiningType
    }
}



// Attach changeImage function to radio button change event
document.querySelectorAll('input[name="combining-type"]').forEach(radioButton => {
    radioButton.addEventListener("change", changeImage);
});




// ------------------------------------------ MISO ----------------------------------------------------------


function miso() {
    // Retrieve values from input fields
    const Nr = parseInt(document.getElementById("Nr").value);
    const noiseVariance = parseFloat(document.getElementById("var").value);

    // Generate matrix H
    const H = generateMatrixMiso(Nr, 1);

    // Get the selected combining type
    const combiningType = document.querySelector('input[name="combining-type"]:checked');

    let result;
    if (combiningType) {
        if (combiningType.id === 'sc') {
            // Calculate SC
            result = calculateSC(H, noiseVariance);
        } else if (combiningType.id === 'mrc') {
            // Calculate MRC
            result = calculateMRC(H, noiseVariance);
        } else if (combiningType.id === 'egc') {
            // Calculate EGC
            result = calculateEGC(H, noiseVariance, Nr);
        }

        // Display matrix H in the matrixContainer div
        const matrixContainer = document.getElementById("matrixContainer");
        displayMatrix(matrixContainer, H);
        matrixContainer.style.display = "block"; // Show matrix container

        // Display the result in Observations div
        const observationsDiv = document.getElementById("observations1");
        observationsDiv.innerHTML = `${combiningType.id.toUpperCase()}: ${result.toFixed(2)}`;
        observationsDiv.parentNode.style.display = "block"; // Show observations div

        
        // Show the Threshold input field and Outage button
        document.getElementById("outageInputContainer").style.display = "block";
        document.getElementById("outageButton").style.display = "block";

    }
}




// Variable to store the channel matrix
let channelMatrixMiso;

// Function to handle "Get Channel" button click
function getChannelMiso() {
    const NrMiso = parseInt(document.getElementById("NrMiso").value);
    // Reset the channel matrix to null before generating the new matrix
    channelMatrixMiso = null;

    // Generate matrix H only if it hasn't been generated before or if the button is clicked again
    channelMatrixMiso = generateMatrixMiso(NrMiso, 1);
    
    // Display matrix H in the matrixContainer div
    const matrixContainer = document.getElementById("matrixContainerMiso");
    displayMatrix(matrixContainer, channelMatrixMiso);
    matrixContainer.style.display = "block"; // Show matrix container

    // Show the radio buttons and threshold input
    document.getElementById("optionsContainerMiso").style.display = "block";
}


// Function to handle "Calculate" button click
function calculateMiso() {
    const NrMiso = parseInt(document.getElementById("NrMiso").value);
    const noiseVarianceMiso = parseFloat(document.getElementById("varMiso").value);
    const combiningTypeMiso = document.querySelector('input[name="combining-typeMiso"]:checked');
    const thresholdMiso = parseFloat(document.getElementById("thresholdMiso").value);


    let result;
    let outage;
    if (combiningTypeMiso) {
        if (!channelMatrixMiso) {
            // If channel matrix is not available, generate it
            channelMatrixMiso = generateMatrix(NrMiso, 1);
        }
        
        if (combiningTypeMiso.id === 'scMiso') {
            result = calculateSCMiso(channelMatrixMiso, noiseVarianceMiso);
            outage = calculateSCOutageMiso(result,thresholdMiso, NrMiso);
        } else if (combiningTypeMiso.id === 'mrcMiso') {
            result = calculateMRCMiso(channelMatrixMiso, noiseVarianceMiso);
            outage = calculateMRCOutageMiso(result, thresholdMiso,NrMiso);
        } else if (combiningTypeMiso.id === 'egcMiso') {
            result = calculateEGCMiso(channelMatrixMiso, noiseVarianceMiso, NrMiso);
            outage = calculateEGCOutageMiso(result,thresholdMiso, NrMiso);
        }

        // Display the result and outage in Observations div
        const observationsDiv = document.getElementById("observations1Miso");
        observationsDiv.innerHTML = `Combined SNR: ${result.toFixed(2)}<br>Outage Probability: ${outage.toFixed(4)}`;
        observationsDiv.parentNode.style.display = "block"; // Show observations div

        const imageDisplayMiso = document.getElementById("imageDisplayMiso");
        imageDisplayMiso.src = imageMap[selectedCombiningTypeMiso];
    }
}


    
// Function to calculate Selective Combining (SC)
function calculateSCMiso(H, noiseVariance) {
    return H.reduce((sum, h, i) => sum + (Math.pow(h, 2) / noiseVariance) * (1 / (i + 1)), 0);
}

// Function to calculate Maximal Ratio Combining (MRC)
function calculateMRCMiso(H, noiseVariance) {
    return H.reduce((sum, h) => sum + Math.pow(h, 2) / noiseVariance, 0);
}

// Function to calculate Equal Gain Combining (EGC)
function calculateEGCMiso(H, noiseVariance, Nr) {
    const sum = H.reduce((sum, h) => sum + Math.pow(h, 2) / noiseVariance, 0);
    return (1 / Nr) * sum;
}

// Function to generate a matrix with random values
function generateMatrixMiso(rows, cols) {
    var matrix = [];
    for (var i = 0; i < rows; i++) {
        matrix[i] = [];
        for (var j = 0; j < cols; j++) {
            matrix[i][j] = Math.random(); // You can adjust this to generate desired values
        }
    }
    return matrix;
}

// Function to display matrix in HTML table format
function displayMatrixMiso(container, matrix) {
    container.innerHTML = ""; // Clear previous content

    // Create matrix label
    var matrixLabel = document.createElement("div");
    matrixLabel.textContent = "H = ";
    matrixLabel.style.fontWeight = "bold";
    matrixLabel.style.marginBottom = "10px";
    container.appendChild(matrixLabel);

    // Create matrix table
    var table = document.createElement("table");
    table.classList.add("matrix");
    for (var i = 0; i < matrix.length; i++) {
        var row = document.createElement("tr");
        for (var j = 0; j < matrix[i].length; j++) {
            var cell = document.createElement("td");
            cell.textContent = matrix[i][j].toFixed(2); // Display values rounded to 2 decimal places
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    container.appendChild(table); // Append the table to the container
}

// ------------------------------------------Outage Probability ----------------------------------------------------------



// Function to calculate outage probability
function calculateOutageMiso() {
    const combiningType = document.querySelector('input[name="combining-typeMiso"]:checked');
    const threshold = parseFloat(document.getElementById("thresholdMiso").value);
    const result = parseFloat(document.getElementById("observations1Miso").textContent.split(": ")[1]);
    const Nr = parseInt(document.getElementById("Nr").value);

    let outage;
    if (combiningType) {
        if (combiningType.id === 'scMiso') {
            outage = calculateSCOutageMiso(result, threshold, Nr);
        } else if (combiningType.id === 'mrcMiso') {
            outage = calculateMRCOutageMiso(result, threshold, Nr);
        } else if (combiningType.id === 'egcMiso') {
            outage = calculateEGCOutageMiso(result, threshold, Nr);
        }

        const observationsDiv = document.getElementById("observations1");
        observationsDiv.innerHTML = `${combiningType.id.toUpperCase()}: ${result.toFixed(2)}<br>Outage: ${outage.toFixed(4)}`;
    }
}

// Helper functions for outage probability calculations
function calculateSCOutageMiso(result, threshold, Nr) {
    return Math.pow(1 - Math.exp(-threshold / result), Nr);
}

function calculateMRCOutageMiso(result, threshold, Nr) {
    let outage = Math.pow(1 - Math.exp(-threshold / result), Nr);
    for (let i = 1; i <= Nr; i++) {
        outage += (Math.pow(threshold / result, i - 1) / factorial(i - 1)) * Math.pow(1 - Math.exp(-threshold / result), Nr - i);
    }
    return outage;
}

function calculateEGCOutageMiso(result, threshold, Nr) {
    const temp = result / (Nr * threshold);
    const Q = (x) => 0.5 * erfc(x / Math.sqrt(2));
    return Math.pow(1 - Math.exp(-2 * threshold / result), Nr) * (1 - 2 * Q(Math.sqrt(2 * temp)));
}

function factorial(n) {
    if (n === 0 || n === 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

function erfc(x) {
    // Complementary error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

    return x >= 0 ? y : 2 - y;
}





// ------------------------------------------ Image ----------------------------------------------------------
// Function to handle radio button change and update the image
function changeImageMiso() {
    const radioButtons = document.querySelectorAll('input[name="combining-typeMiso"]:checked');
    if (radioButtons.length > 0) {
        selectedCombiningType = radioButtons[0].value; // Update selectedCombiningType
        const imageDisplay = document.getElementById("imageDisplayMiso");
        imageDisplay.src = imageMap[selectedCombiningType]; // Set image src based on selectedCombiningType
    }
}



// Attach changeImage function to radio button change event
document.querySelectorAll('input[name="combining-typeMiso"]').forEach(radioButton => {
    radioButton.addEventListener("change", changeImage);
});

// ------------------------------------------ On startup ----------------------------------------------------------

function startup()
{
    document.getElementById("default").click();
}

window.onload = startup;
