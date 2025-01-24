/**
 * All of the front-end game logic for the knock-off version of this game.
 */

// Document references
const aside = document.querySelector("aside");
const section = document.querySelector("section");

// Sound effects
let clickAudio = document.createElement("audio");
clickAudio.src = "/audio/click_001.ogg";

let mildSuccessAudio = document.createElement("audio");
mildSuccessAudio.src = "/audio/mild_success.ogg";

let currentHoverElement, currentDraggingElement;

// Default elements. This array will also contain all of the unlocked elements by the player
let currentUnlocked = [
    {
        emoji: "💧",
        name: "Water"
    },
    {
        emoji: "🌬",
        name: "Wind"
    },
    {
        emoji: "🔥",
        name: "Fire"
    },
    {
        emoji: "🌎",
        name: "Earth"
    }
];

// Check if the local storage contains save information
let existingSave = localStorage.getItem("plenty_save");
if (existingSave) {
    // Parse the existing save file
    existingSave = JSON.parse(existingSave);
    console.log("Existing save found");
    if (existingSave.unlocked) { // Set the currently unlocked items to the save file
        currentUnlocked = existingSave.unlocked;
    }
} else {
    // Save the base items into local storage
    localStorage.setItem("plenty_save", JSON.stringify({unlocked: currentUnlocked}));
}

// Create elements in the side bar for each unlocked element
currentUnlocked.forEach(e => {
    AddElement(e.emoji, e.name);
})

/**
 * Add an unlocked element to the side bar if it does not exist. Triggers save
 * @param {string} emoji Emoji to display
 * @param {string} name Name of the element
 * @returns 
 */
function AddUnlockedElement(emoji, name) {

    // Check if this element is already unlocked by name
    let existingIndex = currentUnlocked.findIndex(x => x.name.toLowerCase() == name.toLowerCase());
    if (existingIndex != -1) {
        return;
    }

    // Create the element in the side bar
    AddElement(emoji, name);
    // Add it to the unlocked items array
    currentUnlocked.push({
        emoji,
        name
    })

    // Save the current unlocked elements array to local storage
    localStorage.setItem("plenty_save", JSON.stringify({unlocked: currentUnlocked}));
}

/**
 * Add the element to the side bar along with the mouse event.
 * @param {string} emoji Emoji to display
 * @param {string} name Element name
 */
function AddElement(emoji, name) {
    let elem = CreateElement(emoji, name);

    // Add click event for cloning the element
    elem.addEventListener("mousedown", (e) => {
        // Reset current hovering element
        currentHoverElement = null;

        PlayAudio(clickAudio);

        // Creates the draggable version of this element
        // This is the type that can be dragged and combined
        // by the player in the big canvas area.
        AddDraggableElement(emoji, name);
    })

    // Add the element to the side bar
    aside.appendChild(elem);
}

/**
 * Create a draggable version of an element
 * This version can be dragged around and combined by the 
 * player in the big canvas area.
 * @param {string} emoji Emoji to display
 * @param {string} name Element name
 * @returns 
 */
function AddDraggableElement(emoji, name) {
    // Get the base element
    let newElement = CreateElement(emoji, name);
    // Add it to the main section
    section.appendChild(newElement);
    // Add classes for css cursor events
    newElement.classList.add("moveable");
    newElement.classList.add("dragging");

    // Set current dragging element to the newly created one
    currentDraggingElement = newElement;
    
    // Start of mouse hold / drag
    newElement.addEventListener("mousedown", (e) => {
        // Disable dragging for loading elements
        if (newElement.classList.contains("loading")) {
            return;
        }

        // Play pick-up audio
        PlayAudio(clickAudio);

        // Set current element to dragging element
        currentDraggingElement = newElement;
        newElement.classList.add("dragging");
    })

    // Right-click event for element
    newElement.addEventListener("contextmenu", (e) => {
        // Disable right click for loading elements / if the ctrl key is pressed
        if (e.ctrlKey || newElement.classList.contains("loading")) {
            return;
        }

        // Disable right-click context menu
        e.preventDefault();
        // Remove the element
        newElement.remove()
    })

    // Hover event. Used to determine which element to combine the
    // currently dragged element with.
    newElement.addEventListener("mouseenter", () => {
        // Disable hovering for loading elements
        if (newElement.classList.contains("loading")) {
            return;
        }

        // Update the current hovering element
        currentHoverElement = newElement;
    })

    // Hover end event.
    newElement.addEventListener("mouseleave", () => {
        // Disable hovering for loading elements
        if (newElement.classList.contains("loading")) {
            return;
        }

        // Update the current hovering element
        currentHoverElement = null;
    })

    // Return the newly created HTML element
    return newElement;
}

/**
 * Create a HTML element for an element
 * @param {string} emoji Emoji to display
 * @param {string} name Element name
 * @returns {HTMLElement} The created HTML element
 */
function CreateElement(emoji, name) {

    // Create the base element container
    let element = document.createElement("div");
    element.classList.add("element");
    // Add attribute for retrieving the element name
    element.setAttribute("data-element", name);

    // Create the Emoji element
    let emojiElement = document.createElement("span");

    // Use twemoji to display the emoji
    emojiElement.innerHTML = twemoji.parse(emoji, {
        base: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/"
    });
    element.appendChild(emojiElement);

    // Create the name element
    let nameElement = document.createElement("span");
    nameElement.innerText = name;
    element.appendChild(nameElement)

    return element;

}

// AddElement("😀", "Smiley");
// AddElement("🏀", "Basketball");

// Event for when an element is no longer being dragged / dropped on something
document.addEventListener("mouseup", async (e) => {

    // Check if the dropped location is on the side bar
    if (e.clientX > screen.width - aside.clientWidth) {
        // Delete the current element
        if (currentDraggingElement) {
            currentDraggingElement.remove();
        }
        currentDraggingElement = null;
        currentHoverElement = null;
        return;
    }

    // Check if the element is being dropped on another element
    if (currentDraggingElement && currentHoverElement) {

        // Play sound for dropping
        PlayAudio(clickAudio);

        // Get the names of the elements via their attributes
        let elementA = currentDraggingElement.getAttribute("data-element");
        let elementB = currentHoverElement.getAttribute("data-element");

        // Add the loading animation to each element
        currentDraggingElement.classList.add("loading");
        currentHoverElement.classList.add("loading");

        // Create a copy for reference due to async functions
        let elemACopy = currentDraggingElement;
        let elemBCopy = currentHoverElement;

        // Clear hovering and dragging elements
        currentHoverElement = null;
        currentDraggingElement = null;

        // Make an API request to the back-end to get the result of 
        // the combination of the two given elements.
        let res = await CombineElements(elementA, elementB);

        if (res) { // Successfully created a new element

            // Create the new draggable element
            let newCreatedElement = AddDraggableElement(res.emoji, res.object);
            // Set the position
            newCreatedElement.style.left = elemACopy.style.left;
            newCreatedElement.style.top = elemACopy.style.top;

            // Add the element to the side bar so it can be used again
            AddUnlockedElement(res.emoji, res.object);

            // Remove both original elements
            elemACopy?.remove();
            elemBCopy?.remove();
        } else { // Combination didn't work. Remove the loading class
            currentDraggingElement.classList.remove("loading");
            currentHoverElement.classList.remove("loading");
        }

    }

    if (currentDraggingElement) {
        currentDraggingElement.classList.remove("dragging");
    }

    // Clear hovering and dragging elements
    currentHoverElement = null;
    currentDraggingElement = null;
})

// Event for when the mouse changes position
document.addEventListener("mousemove", (e) => {
    if (currentDraggingElement) { // Check if we are dragging an element
        // Update the position of the dragged element to the mouse position.
        currentDraggingElement.style.top = e.clientY - currentDraggingElement.clientHeight / 2 + "px";
        currentDraggingElement.style.left = e.clientX - currentDraggingElement.clientWidth / 2 + "px"
    }
})

/**
 * Make an API request to combine two elements with their names
 * @param {string} elemA Name of the first element
 * @param {string} elemB Name of the second element
 * @returns {boolean|object} The newly created object or false on error
 */
async function CombineElements(elemA, elemB) {

    // Check if both elements are given
    if (!elemA || !elemB) {
        return false;
    }

    console.log(`Combining elements "${elemA}" with "${elemB}"`);

    try {

        // Make the API request
        let res = await fetch(`/element?a=${encodeURIComponent(elemA)}&b=${encodeURIComponent(elemB)}`);
        let json = await res.json();

        if (!json.success) {
            return false;
        }

        if (json.isNew) { // Play the success audio
            PlayAudio(mildSuccessAudio);
        }

        // Return the element from the back-end
        return json.element;

    } catch (e) {
        // Really good error handeling
        console.error(e);
        return false;
    }

}

/**
 * Helper function to play a sound effect
 * @param {HTMLAudioElement} audio 
 */
function PlayAudio(audio) {
    // Check if the sound is currently playing
    if (audio.currentTime <= audio.duration) {
        // Reset the sound effect progress to 0
        audio.pause();
        audio.currentTime = 0;
    }
    audio.play();
}
