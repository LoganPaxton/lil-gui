import Controller from './Controller';

export default class FileController extends Controller {
	constructor(parent, object, property) {
		super(parent, object, property, 'upload', 'label');

		// Create the file input element
		this.$input = document.createElement('input');
		this.$input.setAttribute('type', 'file');
		this.$input.setAttribute('aria-labelledby', this.$name.id);

		// Append input to the widget
		this.$widget.appendChild(this.$input);

		// Handle file selection
		this.$input.addEventListener('change', (event) => {
			const file = event.target.files[0]; // Get the selected file
			if (file) {
				this.setValue(file); // Update the object property with the file
				this._callOnFinishChange(file); // Trigger the onFinishChange callback
			}
		});
	}

	/**
	 * Sets the value of the property.
	 * @param {File} file - The selected file.
	 */
	setValue(file) {
		// Update the object property with the file or custom logic
		this.object[this.property] = file;
	}
}
