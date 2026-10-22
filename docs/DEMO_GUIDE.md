# DEMO GUIDE

This guide provides a structured workflow for demonstrating the complete capabilities of the DRONE PILOT application.

## 1. Authentication
1. Navigate to `/`.
2. Click **Login** or **Sign Up**.
3. Create a test account to demonstrate data isolation.

## 2. Hangar & Configuration
1. In the **Hangar**, select **Quad**, **Hexa**, or **Octa**.
2. Click **Configure**.
3. Adjust physical parameters:
   - Decrease battery capacity.
   - Modify motor RPM limits (observe the validation engine flag impossible values).
4. Click **Save Configuration**.

## 3. Launch Simulation
1. From the Hangar, click **Launch Simulator**.
2. Observe the 3D environment loading and the aircraft spawning securely on the helipad.
3. Use `WASD` or on-screen controls to fly the aircraft. Observe standard rigid body dynamics (pitch, roll, yaw, acceleration).

## 4. Manipulate Aircraft State
1. Open the **Diagnostics / Faults** panel (wrench icon).
2. **Motor Failure**: Disable Motor 1. Observe the quadcopter lose stability and spin. Re-enable it.
3. **Payload**: Add a 3kg payload. Observe the drone struggle to maintain altitude and require higher throttle.
4. **Battery**: Set battery to 5%. Observe the low battery warnings on the HUD and eventual auto-descent.
5. Click **Reset Experiment** to return to nominal baseline.

## 5. Manipulate Environment
1. Open the **Environment** panel (cloud icon).
2. Increase **Wind Speed** to 10 m/s. Observe the drone actively drift and tilt into the wind to hold position.
3. Add **Turbulence**. Observe random angular torque disturbing the hover.
4. Click **Apply Weather Preset: Storm**.

## 6. Run Educational Scenario
1. Open the **Scenarios** panel (graduation cap icon).
2. Select **Motor Failure Recovery**.
3. Follow the Flight Coach HUD instructions.
4. Let the scenario complete or fail.
5. View the post-flight **Analysis Debrief**, highlighting telemetry bounds (max altitude, max drift, battery consumed).

## 7. Session Reset & Exit
1. Click **Reset Simulation** to return to the helipad.
2. Click **Return to Hangar**.
3. Verify that the saved configuration remains intact, proving runtime state manipulation did not pollute the persistent Digital Twin.
