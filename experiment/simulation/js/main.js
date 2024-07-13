

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