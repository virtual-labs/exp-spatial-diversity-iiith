# THEORY
### Spatial diversity is a crucial technique in telecommunications aimed at reducing signal fading and improving overall system performance. By deploying multiple antennas at either the transmitter (MISO), receiver (SIMO), or both (MIMO), spatial diversity enhances signal strength and reliability in wireless communication networks. A fundamental aspect of spatial diversity is the careful consideration of antenna spacing to ensure that the fading observed by each antenna is independent. This independence is essential for effectively combining the signals to avoid deep fade instances and thereby improve the communication reliability. Typically, antennas are spaced at intervals of $\frac{\lambda}{4}$, where $\lambda$ represents the wavelength of the transmitted signal. To harness the  spatial diversity via multiple antennas, it is crucial to employ an efficient combining technique at the receiver for SIMO system and beamforming technique at the transmitter for MISO system. These combining/beamforming techniques play a crucial role for exploiting spatial diversity, however they require the knowledge of the channel state information (CSI) and noise power. In the following, we provide a brief background on the various combining/beamforming techniques for SIMO and MISO systems.

# Receiver Diversity: SIMO
### The combining can be done in several ways which vary in terms of design complexity and  performance gain. Most combining techniques are linear: the output of the combiner is just a weighted sum of the different (independent) fading paths or branches as shown in the figure below.
![SIMO]("C:\Users\Manasa\Downloads\Exp5.png")
```math
    \mathbf{y} = \left(w_1\mathbf{h}_1 + w_2\mathbf{h}_2 + \ldots+w_{N_r}\mathbf{h}_{N_r}\right)\mathbf{x}.\nonumber
```
### Depending on the strength of the channel vector $\mathbf{h}$ (also called as CSI), different combining techniques select weight vector $\mathbf{w}$ (usually referred  as combiner or beamformer) to exploit spatial diversity effectively. These weights determine how signals from multiple antennas are combined to maximize the received signal quality.
### There are two types of performance gain associated with receiver space diversity: 
### 1) Array gain
### It represents the increase in signal strength obtained by using multiple antennas arranged in an array configuration, allowing for enhanced signal reception in specific directions while reducing interference from other directions. Mathematically, it can be defined as the increase in averaged combined SNR $\bar{\gamma}_c$ over the average branch SNR $\bar{\gamma}$ 
```math
 A_g = \frac{\bar{\gamma}_c}{\bar{\gamma}}
```
### 2) Diversity order
### The diversity order indicates how the slope of the average probability of error as a function of average SNR changes with diversity.
### Also, characterizing the outage performance becomes a crucial aspect for comparison of the various methods. Outage probability can be defined as the probability that the recieved signal power or the combined SNR of the array is greater that a certain pre-specified threshold.
```math
    P_{out}(\gamma_0) = p(\gamma_c > \gamma_0)
```
### Lower outage probabilities indicate higher reliability and better performance under challenging channel conditions, such as fading, interference, and noise.

## Selection Combining
### Selection combining does not assign weights based on channel strengths but rather selects the signal with the highest instantaneous SNR among the received signals. Only the selected signal is further processed, while the others are discarded.
\begin{figure}[!ht]
    \centering
    \includegraphics[width=0.4\textwidth]{exp5_1.png}
\end{figure}
```math
    \mathbf{y} =  \mathbf{h}_2\mathbf{x}.\nonumber
```
### The average combined SNR of the array for this technique is given as
```math
    \bar{\gamma}_c = \sum_{i=1}^{N_r} \frac{\bar{\gamma}_i}{i}.
```
### We can observe that the SNR gain increases with the number of receive antennas, but not linearly. Increasing the number of diversity branches from two to three will give much less gain than going from one to two.
### For a Rayleigh fading channel, the outage probability is derived as
```math
    P_{out}(\gamma_o) = \left[1 - e^{-\frac{\gamma_0}{\bar{\gamma}}}\right]^{N_r} 
```

## Maximal-Ratio Combining
### Maximal Ratio Combining allocates weights to each received signal based on the strength of the corresponding channel coefficient in $\mathbf{h}$. $\mathbf{w}_i$'s assigned to each signal is proportional to its channel gain, aiming to maximize the signal power.
\begin{figure}[!ht]
    \centering
    \includegraphics[width=0.6\textwidth]{exp5_3.png}
\end{figure}
```math
    \mathbf{y} = \left(w_1\mathbf{h}_1 + w_2\mathbf{h}_2 + \ldots+w_{N_r}\mathbf{h}_{N_r}\right)\mathbf{x},\nonumber
```
### where, $w_1>w_2>\ldots>w_{N_r}$ if $\mathbf{h}_1>\mathbf{h}_2>\ldots>\mathbf{h}_{N_r}$. The array gain for this technique is given as
```math
    \gamma_c = \frac{1}{N_0}\sum_{i=1}^{N_r} \mathbf{h}_i^2
```
### where, $N_0$ is the noise variance and it can observed that array gain increases linearly with the number of receive antennas, $N_r$.
### For a Rayleigh fading channel, the outage probability is derived as
```math
    P_{out}(\gamma_o) = 1-e^{-\frac{\gamma_0}{\bar{\gamma}}}\sum_{k=1}^{N_r}\frac{(\frac{\gamma_0}{\bar{\gamma}})^{k-1}}{(k-1)!}\nonumber
```

## Equal gain Combining
### Equal gain combining assigns equal weights to each received signal regardless of the channel coefficients' strengths. This technique simplifies the combining process
\begin{figure}[!h]
    \centering
    \includegraphics[width=0.6\textwidth]{exp5_2.png}
\end{figure}
```math
    \mathbf{y} = \left(\mathbf{h}_1 + \mathbf{h}_2 + \ldots+\mathbf{h}_{N_r}\right)w\mathbf{x}.\nonumber
```
### The array gain for this technique is given as
```math
    \gamma_c = \frac{1}{N_0N_r}\left(\sum_{i=1}^{N_r} \mathbf{h}_i\right)^2.
```
### It can observed that array gain increases linearly with the number of receive antennas, $N_r$. However, performance is slightly less than MRC. This is the price paid for reduced complexity.
### For a Rayleigh fading channel, the outage probability is derived as
```math
    P_{out}(\gamma_o) = 1 -e^{-2\frac{\gamma_0}{\bar{\gamma}}}-\sqrt{\pi\frac{\gamma_0}{\bar{\gamma}}e^{-\frac{\gamma_0}{\bar{\gamma}}}}\left(1-2Q\left(\sqrt{\frac{2\gamma_0}{\bar{\gamma}}}\right)\right)
```

# Transmit Diversity: MISO

## Channel known at the Transmitter
### When the channel state information is known at the transmitter, combining is done in a way similar to the SIMO using Selection combing, equal gain combining, and maximal ratio combining.

## Channel unknown at the Transmitter: Alamouti scheme
