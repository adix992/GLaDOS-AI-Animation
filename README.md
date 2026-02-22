# GLaDOS Lovelace Card for Home Assistant

<img width="296" height="407" alt="image" src="https://github.com/user-attachments/assets/8475b787-fc12-4485-a006-cde25ab8c75b" />


Bring the Aperture Science Enrichment Center to your smart home. This custom Lovelace card provides a fully animated, responsive GLaDOS interface that syncs directly with your Home Assistant Voice Assistant or Assist Satellite entities.

Built entirely with scalable vector graphics (SVG) and native JavaScript, she reacts in real-time to your voice assistant's state, shifting colors, moving her chassis, and staring at you with that familiar, judgmental gaze.

## Features

* **Native Home Assistant Integration:** No tokens or websockets required; it uses native Lovelace state tracking.

* **Cinematic Animations:** Smooth, curve-based animations for breathing, tracking, and talking, mimicking her movements from *Portal 1* & *Portal 2*.

* **Dynamic Personality:** When idle, a weighted behavioral system randomly triggers different movements (scanning the room, showing curiosity, or getting bored).

* **Configurable:** Easily adjust the zoom level and the speed of her erratic eye tracking directly from your dashboard YAML.

## System States

GLaDOS tracks the state of your voice assistant entity and visually responds accordingly:

### 🟡 Standby Mode (Idle)

* **Trigger:** The assistant is waiting for the wake word.

* **Visuals:** Her optic glows in the canonical Aperture Science Yellow/Orange. Her mechanical eyelids are open, and her chassis sways gently.

* **Behavior:** She will randomly look around the room, dart her eye, or execute specific idle animations (like snapping to attention or sighing in boredom).

### 🔵 Aural Receptors Active (Listening)

* **Trigger:** The wake word is detected and she is actively listening.

* **Visuals:** Her optic and matrix LEDs snap to a bright Aperture Blue.

* **Movement:** She snaps her head forward, leans in slightly, and narrows her eyelids to focus directly on you.

### 🟠 Computing Databanks (Processing)

* **Trigger:** You finish speaking, and the system is transcribing/processing your request.

* **Visuals:** Her optic shifts to a deep, burning orange. Blue processing dots light up above her faceplate, and an orange scanning ring materializes.

* **Movement:** She tilts her head downward and squints heavily, with her eyelids twitching erratically to simulate her internal processors working overtime.

### 🔴 Vocalizing (Responding)

* **Trigger:** The system is playing back the Text-to-Speech (TTS) response.

* **Visuals:** Her optic shifts to a hostile, glowing red, accompanied by a flashing danger ring.

* **Movement:** Because she lacks a mouth, she speaks through gesture. She executes smooth, cinematic sweeps mixed with sharp, bird-like pecks and nods to match the cadence of her speech.

## Installation

### Via HACS (Home Assistant Community Store)

1. Open HACS in Home Assistant.

2. Click on the 3 dots in the top right corner and select **Custom repositories**.

3. Add the URL to this repository and select **Lovelace** as the category.

4. Click **Install**.

5. When prompted, reload your browser resources.

## Configuration

Add the card to your dashboard via the Lovelace UI by adding a manual card, or by editing your dashboard YAML:

```yaml
type: custom:glados-card
# REQUIRED: The entity ID of your voice assistant or assist satellite
entity: assist_satellite.living_room
# OPTIONAL: Scale the size of the model (Default: 85)
zoom: 85
# OPTIONAL: How fast her eye darts around during idle. 0 stops it completely. 100 is highly agitated. (Default: 50)
eye_speed: 50
```

*Note: "Aperture Science is not responsible for any sarcastic remarks or sudden urges to test made by your smart home system."*
