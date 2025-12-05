To explore spatial diversity, follow the steps outlined below.
  1) Begin by choosing the diversity type for your experiment. You can either select:
     
      - SIMO (Single Input, Multiple Output): In this configuration, there is a single transmitter (single input) and multiple receivers (multiple outputs), allowing for the use of multiple antennas at the receiver to improve signal reception.
     
      - MISO (Multiple Input, Single Output): In this configuration, there are multiple transmitters (multiple inputs) and a single receiver (single output), using multiple antennas at the transmitter side for transmission diversity.
     
  3) Next, enter the number of antennas you want to use for spatial diversity at either the transmitter or receiver (depending on whether you chose SIMO or MISO) and maximum value is limited to 10.
  4) After entering the desired number of antennas, click on the "Generate Diagram" button. This will display a diagram showing the antennas and the channel coefficients (the parameters that define the propagation between antennas). The channel coefficients provide information about the strength and quality of the links between the different antennas.
  3) Select a combinng technique and click on "Apply Diversity" to apply the chosen technique and see the effects.
  5) After applying the diversity technique, observe the weights assigned to each transmitter and receiver antenna. These weights reflect how the signals from each antenna are combined based on the selected combining technique.

### Key points to observe:
  1) EGC : You should see equal weights applied to each antenna after cophasing all signals. 
  2) MRT : The weights will vary according to the channel conditions. Stronger channel is given higher weight after cophasing.
  3) SC : Here, only the best antenna’s weight will be selected.
