'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _workoutDescription() {
    this.description = `${this.type.replace(
      this.type[0],
      this.type[0].toUpperCase()
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// child classes now take a optional 5th option for old date, instead of creating a new date of current creation.
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, prevDate, prevId) {
    super(coords, distance, duration);
    this.cadence = cadence;
    if (prevDate) this.date = prevDate;
    if (prevId) this.id = prevId;
    this._calcPace();
    this._workoutDescription();
  }

  _calcPace = function () {
    this.pace = this.duration / this.distance;
    return this.pace;
  };
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation, prevDate, prevId) {
    super(coords, distance, duration);
    this.elevation = elevation;
    if (prevDate) this.date = prevDate;
    if (prevId) this.id = prevId;
    this._calcSpeed();
    this._workoutDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const button = document.querySelector('.form__btn');
const formRow = document.querySelectorAll('.form__row');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const edit = document.querySelector('.edit');
const editType = document.querySelector('.edit__input--type');
const editDistance = document.querySelector('.edit__input--distance');
const editDuration = document.querySelector('.edit__input--duration');
const editCadence = document.querySelector('.edit__input--cadence');
const editElevation = document.querySelector('.edit__input--elevation');
const btnSubmitEdit = document.querySelector('.edit__btn--submit');

const btnDeleteAll = document.querySelector('.btn__delete_all');
const btnFormClose = document.querySelector('.form__btn--close');

class App {
  #map;
  #mapEvent;
  #zoomLevel = 13;
  #workouts = [];

  // for editing
  #editedWorkout;
  #editedElement;
  #delElement;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    //event listeners for input of NEW forms
    inputType.addEventListener('change', this._toggleElevationGain('form'));
    containerWorkouts.addEventListener('click', this._focusMarker.bind(this));
    button.addEventListener('click', this._newWorkout.bind(this));
    btnFormClose.addEventListener('click', function (e) {
      e.preventDefault();
      form.querySelectorAll('.form__input').forEach(input => {
        if (input.classList.contains('form__input--type')) return;
        input.value = '';
      });
      form.classList.add('hidden');
    });

    // event listeners for edit forms
    this._eventListenerForEdit();
    editType.addEventListener('change', this._toggleElevationGain('edit'));
    btnSubmitEdit.addEventListener('click', this._submitEdit());

    //event listener for delete
    this._eventListenerForDel();
  }

  _eventListenerForEdit() {
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('edit__btn')) {
        this.#editedElement = e.target.closest(`.workout`);
        // function that changes the element background color temporarily when selected
        this._stylizeSelected();
        // show form, and fill in with default values
        this._showForm('edit').bind(this);
      }
    });
  }

  _eventListenerForDel() {
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('del__btn')) {
        this.#delElement = e.target.closest(`.workout`);
        // popup asking confirmation
        this._delPopup();
      }
    });
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert(`No address found`);
      }
    );
  }

  _loadMap(position) {
    const { longitude, latitude } = position?.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup('You are here!').openPopup();

    // event listener for click on map, shows form
    this.#map.on('click', this._showForm('form').bind(this));

    this.#workouts.forEach(work => this._addMarker(work));
  }

  //option to display form of logging OR form of edit
  _showForm(inputType) {
    return e => {
      // make a form appear, when user clicks on map
      if (inputType === 'form') {
        this.#mapEvent = e;
        form.classList.remove('hidden');
      }
      // make form for editing appear, when user clicks on edit btn for particular element
      if (inputType === 'edit') {
        edit.classList.remove('hidden');
        // function that autofills with prev info
        this._editWorkout(e);
      }
      // add autofocus to distance input box
      document.querySelector(`.${inputType}__input--distance`).focus();
    };
  }
  // toggles elevation
  _toggleElevationGain(inputType) {
    // eventlistener for change of value of input type, both form and edit
    return () => {
      if (inputType === 'form') {
        inputElevation
          .closest('.form__row')
          .classList.toggle('form__row--hidden');
        inputCadence
          .closest('.form__row')
          .classList.toggle('form__row--hidden');
      }

      if (inputType === 'edit') {
        editElevation
          .closest('.edit__row')
          .classList.toggle('edit__row--hidden');
        editCadence.closest('.edit__row').classList.toggle('edit__row--hidden');
      }
    };
  }

  _newWorkout(e) {
    e.preventDefault();
    console.log('asd');
    // declaration and assigning variables, similar named to arguments taken in in data objects
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let cadence, elevation, workout;

    const isNumber = function (...data) {
      return data.every(input => Number.isFinite(input));
    };
    const isPositive = function (...data) {
      return data.every(input => input > 0);
    };

    // for running: error check for data (is a number, && positive number)
    if (type === 'running') {
      cadence = +inputCadence.value;
      // create object with data
      if (
        !isPositive(distance, duration, cadence) ||
        !isNumber(distance, duration, cadence)
      )
        return alert('Inputs have to be numbers and positive 1');

      // if condition satified, create new obj based on type
      workout = new Running(coords, distance, duration, cadence);
      // put object in workouts array
      this.#workouts.push(workout);
    }

    // for cycling: error check for data (is a number, && positive number)
    if (type === 'cycling') {
      elevation = +inputElevation.value;
      // create object with data
      if (
        !isPositive(distance, duration) ||
        !isNumber(distance, duration, elevation)
      )
        return alert('Inputs have to be numbers and positive');

      // if condition satified, create new obj based on type
      workout = new Cycling(coords, distance, duration, elevation);
      // put object in workouts array
      this.#workouts.push(workout);
    }

    // add marker
    this._addMarker(workout);

    // list workout
    this._renderWorkout(workout, 'form');

    //hide foorm
    this._hideForm('form');

    // update local storage
    this._setLocalStorage();
  }

  _addMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        // popup: stylize it, and turn off auto-closing, added element for prebuilt
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${this.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout, inputType) {
    // many variables, depending on type of activity
    let emote, logo, unit, unitGain, activeRate, activeValue;

    if (workout.type === 'running') {
      emote = '🏃‍♂️';
      logo = '🦶🏼';
      unit = 'min/km';
      unitGain = 'spm';
      activeRate = workout.pace;
      activeValue = workout.cadence;
    } else {
      emote = '🚴‍♂️';
      logo = '⛰';
      unit = 'km/h';
      unitGain = 'm';
      activeRate = workout.speed;
      activeValue = workout.elevation;
    }

    const html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__btn--container">
        <button class="workout__btn edit__btn">Edit</button>
        <button class="workout__btn del__btn">&times;</button>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${emote}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${activeRate.toFixed(1)}</span>
        <span class="workout__unit">${unit}</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${logo}</span>
        <span class="workout__value">${activeValue}</span>
        <span class="workout__unit">${unitGain}</span>
      </div>
    </li>`;

    if (inputType === 'form') {
      form.insertAdjacentHTML('afterend', html);
      // whenever new workout is added, we want to refresh the eventListeber for edit button clicks, and include the newest member
      this._refreshEditListener('add');
    }

    if (inputType === 'edit') {
      // console.log(workout);
      // console.log(html);
      return html;
    }
  }

  _hideForm(inputType) {
    if (inputType === 'form') {
      form.querySelectorAll('.form__input').forEach(input => {
        if (input.classList.contains('form__input--type')) return;
        input.value = '';
      });
      form.classList.add('hidden');
    }

    if (inputType === 'edit') {
      edit.querySelectorAll('.edit__input').forEach(edit => {
        if (edit.classList.contains('edit__input--type')) return;
        edit.value = '';
      });
      edit.classList.add('hidden');
    }
  }

  // event handler, when edit btn clicked, to highlight it, via adding style
  _stylizeSelected() {
    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(work => work.classList.remove('active'));

    this.#editedElement.classList.add('active');
  }

  // event listener on which element is clicked (via delegation and bubbling)
  _focusMarker(e) {
    // return if the clicked element is NOT within the 'workout' class
    if (!e.target.closest('.workout')) return;

    const selectedID = e.target.closest('.workout').dataset.id;

    // extract the correct object from array of objects, via find, by comparing id @ workout list in DOM, and id @ object in object array
    const selectedWorkout = this.#workouts.find(ele => ele.id === selectedID);

    // via coords on selectedObject, set view of map
    this.#map.setView(selectedWorkout.coords, this.#zoomLevel, {
      animate: true,
      duration: 1,
    });
  }

  // actions to do when edit Workout form appears, 'e' parameter is the event associated with click on 'edit' button for that workout.
  _editWorkout(e) {
    // fill default value of each input with associated object (again via ID)
    const selectedID = e.target.closest('.workout').dataset.id;
    const selectedWorkout = this.#workouts.find(ele => ele.id === selectedID);
    this.#editedWorkout = selectedWorkout;

    const settingValues = function (activeInput) {
      const inactiveInput = activeInput === 'cadence' ? 'elevation' : 'cadence';
      // pre-fill with only relevant data, distance, duration and elev / cadence
      document.querySelector(`.edit__input--${activeInput}`).value =
        selectedWorkout[activeInput];
      editType.value = selectedWorkout.type;
      document.querySelector(`.edit__input--${inactiveInput}`).value = '';

      // show cadence, hide elevation OR vice versa
      document
        .querySelector(`.edit__input--${activeInput}`)
        .closest(`.edit__row`)
        .classList.remove('edit__row--hidden');
      document
        .querySelector(`.edit__input--${inactiveInput}`)
        .closest(`.edit__row`)
        .classList.add('edit__row--hidden');

      // show distance and duration
      editDistance.value = selectedWorkout.distance;
      editDuration.value = selectedWorkout.duration;
    };

    // change .value of all edit inputs
    if (selectedWorkout.type === 'running') {
      settingValues('cadence');

      // // pre-fill with only relevant data, distance, duration and elev
      // editCadence.value = selectedWorkout.cadence;
      // editType.value = selectedWorkout.type;
      // editElevation.value = '';
      // // show cadence and hide elevation
      // editCadence.closest('.edit__row').classList.remove('edit__row--hidden');
      // editElevation.closest('.edit__row').classList.add('edit__row--hidden');
    }

    if (selectedWorkout.type === 'cycling') {
      settingValues('elevation');
    }

    // event listener for "x" button, to hide edit form
    const btnCloseEdit = document.querySelector('.edit__btn--close');
    btnCloseEdit.addEventListener('click', function (e) {
      e.preventDefault();

      edit.classList.add('hidden');
      containerWorkouts
        .querySelectorAll('.workout')
        .forEach(work => work.classList.remove('active'));
    });
  }

  _submitEdit() {
    return e => {
      e.preventDefault();

      const distance = +editDistance.value;
      const duration = +editDuration.value;
      let cadence, elevation, workout;

      const isNumber = function (...data) {
        return data.every(input => Number.isFinite(input));
      };
      const isPositive = function (...data) {
        return data.every(input => input > 0);
      };

      // error check for input
      if (editType.value === 'running') {
        cadence = +editCadence.value;
        // create object with data
        if (
          !isPositive(distance, duration, cadence) ||
          !isNumber(distance, duration, cadence)
        )
          return alert('Inputs have to be numbers and positive 1');

        // if condition satified, make new Running oject, replace old in the array
        workout = new Running(
          this.#editedWorkout.coords,
          distance,
          duration,
          cadence
        );
      }
      if (editType.value === 'cycling') {
        elevation = +editElevation.value;
        // create object with data
        if (
          !isPositive(distance, duration) ||
          !isNumber(distance, duration, elevation)
        )
          return alert('Inputs have to be numbers and positive 2');

        // if condition satified, make new Running oject, replace old in the array
        workout = new Cycling(
          this.#editedWorkout.coords,
          distance,
          duration,
          elevation
        );
      }
      workout.description = `${workout.type.replace(
        workout.type[0],
        workout.type[0].toUpperCase()
      )} on ${
        months[this.#editedWorkout.date.getMonth()]
      } ${this.#editedWorkout.date.getDate()}`;
      workout.id = this.#editedWorkout.id;

      // with id, search for editedWorkout at array, and change it with new workout obj
      const index = this.#workouts.findIndex(ele => ele.id === workout.id);
      this.#workouts[index] = workout;

      // change value of displayed HTML, with the new obj, via replacing it completely
      this._replacingHTML(workout);

      // clearing the edit form
      this._hideForm('edit');

      // change popup in map
      this._addMarker(workout);

      // updating local storage
      this._setLocalStorage();

      // refresh
      // location.reload();
    };
  }

  _replacingHTML(workout) {
    // element that is replaced
    console.log(this.#editedElement);
    // element that is replacing
    let newElement = document.createElement('li');
    newElement.innerHTML = this._renderWorkout(workout, 'edit');
    newElement = newElement.querySelector('.workout');
    newElement.parentElement.remove();
    console.log(newElement);
    // call replaceWith()
    this.#editedElement.replaceWith(newElement);
    this._refreshEditListener('edit', newElement);
  }

  _refreshEditListener(changeType, btnClicked) {
    // add new event listener for edit btn of new workout
    if (changeType === 'add') {
      document
        .querySelector('.edit__btn')
        .addEventListener('click', this._showForm('edit').bind(this));

      // document
      // .querySelector('.del__btn')
      // .addEventListener('click', this._delPopup());
    }

    // add new event listener for edit btn of edited workout
    if (changeType === 'edit') {
      btnClicked.addEventListener('click', this._showForm('edit').bind(this));

      // btnClicked.addEventListener('click', this._delPopup.bind(this));
    }
  }

  _delPopup() {
    // condition: remove existing confirmation popups
    containerWorkouts.querySelector('.warning')?.remove();

    //retrieve desc from object of the same element
    const selectedID = this.#delElement.dataset.id;
    const selectedWorkout = this.#workouts.find(ele => ele.id === selectedID);
    const index = this.#workouts.findIndex(ele => ele.id === selectedID);

    this.#delElement.insertAdjacentHTML(
      'beforebegin',
      `<section class="warning">
        <h2 class="warning__title">Warning! ⛔</h2>
        <p class="warning__content">Are you sure you want to delete: <b>${selectedWorkout.description}</b>?
        </p>
        <div class="warning__btn--container">
          <button class="warning__btn warning__btn--confirm">Confirm</button>
          <button class="warning__btn warning__btn--cancel" autofocus>
            Cancel
          </button>
        </div>
      </section>`
    );

    const btnCancel = document.querySelector('.warning__btn--cancel');
    const btnConfirm = document.querySelector('.warning__btn--confirm');

    // if user cancels:
    btnCancel.addEventListener('click', function () {
      btnCancel.closest('.warning').remove();
    });

    //if user confirms:
    const confirmEvent = function () {
      // deletes it
      // remove from array
      this.#workouts.splice(index, 1);
      console.log(this.#workouts);

      //remove from HTML
      this.#delElement.remove();

      // remove warning popup
      btnConfirm.closest('.warning').remove();

      // update local storage and refresh
      this._setLocalStorage();
      location.reload();
    };
    btnConfirm.addEventListener('click', confirmEvent.bind(this));
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workoutsArr = JSON.parse(localStorage.getItem('workouts'));
    if (!workoutsArr) return;
    console.log(workoutsArr);
    // this.#workouts = workoutsArr;

    workoutsArr.forEach((workout, i) => {
      const coords = workout.coords;
      const distance = workout.distance;
      const duration = workout.duration;
      const date = new Date(workout.date);
      const id = workout.id;
      let elevation, cadence, newWork;
      // if object is of runnin type, create new object with running!
      if (workout.type === 'running') {
        cadence = workout.cadence;
        newWork = new Running(coords, distance, duration, cadence, date, id);
      }
      if (workout.type === 'cycling') {
        elevation = workout.elevation;
        newWork = new Cycling(coords, distance, duration, elevation, date, id);
      }
      // push workout to #workouts
      this.#workouts.push(newWork);
    });

    this.#workouts.forEach(work => this._renderWorkout(work, 'form'));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const newApp = new App();

//event listener for deleteALL
btnDeleteAll.addEventListener('click', function (e) {
  e.preventDefault();

  // if()
  if (confirm('Are you sure?')) {
    newApp.reset();
  }
});

// navigator.geolocation.getCurrentPosition(
//   function (position) {
//     const { longitude, latitude } = position?.coords;

//     //the "e" object found in clicking map, to get location of click
//     let eObject;
//     let map;

//     console.log(`https://www.google.com/maps/@${latitude},${longitude},16.25z`);

//     const coords = [parseFloat(latitude), parseFloat(longitude)];
//     map = L.map('map').setView(coords, 13);

//     L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//       attribution:
//         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//     }).addTo(map);

//     L.marker(coords)
//       .addTo(map)
//       .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
//       .openPopup();

//     function onClick(e) {
//       // make a form appear, when user clicks on map
//       form.classList.remove('hidden');
//       // add autofocus to distance input box
//       document.querySelector('.form__input--distance').focus();
//       eObject = e;
//     }

//     // eventListener, for clicks in map, mainly to make inputbox appear, and to log the click's location on map
//     map.on('click', onClick);

//     // eventlistener for change of value of input type
//     inputType.addEventListener('change', function () {
//       inputElevation
//         .closest('.form__row')
//         .classList.toggle('form__row--hidden');
//       inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
//     });

//     // WHEN user submits form, create a marker, adding to map, bind it with a popup
//     button.addEventListener('click', function (event) {
//       event.preventDefault();

//       const { lat, lng } = eObject.latlng;
//       const coords = [lat, lng];

//       // calculating and extracting month/date.
//       const date = new Date();
//       const dateShort = new Intl.DateTimeFormat(navigator.language, {
//         month: 'long',
//         day: 'numeric',
//       }).format(date);

//       // many variables, depending on type of activity
//       let emote;
//       let logo;
//       let unit;
//       let unitGain;
//       let calculation;
//       let activeValue;

//       if (inputType.value === 'running') {
//         emote = '🏃‍♂️';
//         logo = '🦶🏼';
//         unit = 'min/km';
//         unitGain = 'spm';
//         calculation =
//           parseFloat(inputDuration.value) / parseFloat(inputDistance.value);
//         activeValue = inputCadence.value;
//       } else {
//         emote = '🚴‍♂️';
//         logo = '⛰';
//         unit = 'km/h';
//         unitGain = 'm';
//         calculation =
//           parseFloat(inputDistance.value) /
//           parseFloat(inputDuration.value) /
//           60;
//         activeValue = inputElevation.value;
//       }

//       // string format of: "activity" on "date"
//       const activityDetail = `${emote} ${inputType.value.replace(
//         inputType.value[0],
//         inputType.value[0].toUpperCase()
//       )} on ${dateShort}`;

//       // add marker to map
//       L.marker(coords)
//         .addTo(map)
//         .bindPopup(
//           // popup: stylize it, and turn off auto-closing, added element for prebuilt
//           L.popup({
//             maxWidth: 250,
//             minWidth: 100,
//             autoClose: false,
//             closeOnClick: false,
//             className: `${inputType.value}-popup`,
//           })
//         )
//         .setPopupContent(activityDetail)
//         .openPopup();

//       // create a permanent list of workouts, with data saved
//       form.insertAdjacentHTML(
//         'afterend',
//         `<li class="workout workout--${inputType.value}" data-id="${'id'}">
//           <h2 class="workout__title">${activityDetail}</h2>
//           <div class="workout__details">
//             <span class="workout__icon">${emote}</span>
//             <span class="workout__value">${inputDistance.value}</span>
//             <span class="workout__unit">km</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">⏱</span>
//             <span class="workout__value">${inputDuration.value}</span>
//             <span class="workout__unit">min</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">⚡️</span>
//             <span class="workout__value">${calculation.toFixed(1)}</span>
//             <span class="workout__unit">${unit}</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">${logo}</span>
//             <span class="workout__value">${activeValue}</span>
//             <span class="workout__unit">${unitGain}</span>
//           </div>
//         </li>`
//       );

//       // via data attribute, create attribute with values of coords of marker. Then, eventlistener for when workout clicked, re-center the map API, via value of data attribute

//       // make form reset and become hidden again
//       form.querySelectorAll('.form__input').forEach(input => {
//         if (input.classList.contains('form__input--type')) return;
//         input.value = '';
//       });
//       form.classList.add('hidden');
//     });
//   },
//   function () {
//     alert(`No address found`);
//   }
// );
