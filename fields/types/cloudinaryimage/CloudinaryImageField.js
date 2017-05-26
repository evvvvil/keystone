/*
TODO: CloudinaryImageType actally supports 'remove' and 'reset' actions, but
this field will only submit `""` when 'remove' is clicked. @jossmac we need to
work out whether we're going to support deleting through the UI.
*/

import React, { PropTypes } from 'react';
import Field from '../Field';
import Select from 'react-select';
import cloudinaryResize from '../../../admin/client/utils/cloudinaryResize';
import { Button, FormField, FormInput, FormNote } from '../../../admin/client/App/elemental';

import ImageThumbnail from '../../components/ImageThumbnail';
import FileChangeMessage from '../../components/FileChangeMessage';
import HiddenFileInput from '../../components/HiddenFileInput';
import Lightbox from 'react-images';

const SUPPORTED_TYPES = ['image/*', 'application/pdf', 'application/postscript'];
const SUPPORTED_REGEX = new RegExp(/^image\/|application\/pdf|application\/postscript/g);

let uploadInc = 1000;

const buildInitialState = (props) => ({
	removeExisting: false,
	uploadFieldPath: `CloudinaryImage-${props.path}-${++uploadInc}`,
	userSelectedFile: null,
	selectValue: null,
});

module.exports = Field.create({
	propTypes: {
		collapse: PropTypes.bool,
		label: PropTypes.string,
		list: PropTypes.string.isRequired,
		note: PropTypes.string,
		path: PropTypes.string.isRequired,
		select: PropTypes.bool,
		value: PropTypes.shape({
			format: PropTypes.string,
			height: PropTypes.number,
			public_id: PropTypes.string,
			resource_type: PropTypes.string,
			secure_url: PropTypes.string,
			signature: PropTypes.string,
			url: PropTypes.string,
			version: PropTypes.number,
			width: PropTypes.number,
			context: PropTypes.shape({
				custom: PropTypes.shape({
					filename: PropTypes.string,
				}),
			}),
		}),
	},
	displayName: 'CloudinaryImageField',
	statics: {
		type: 'CloudinaryImage',
		getDefaultValue: () => ({}),
	},
	getInitialState () {
		return buildInitialState(this.props);
	},
	componentWillReceiveProps (nextProps) {
		// console.log('CloudinaryImageField nextProps:', nextProps);
	},
	componentWillUpdate (nextProps) {
		// Reset the action state when the value changes
		// TODO: We should add a check for a new item ID in the store
		if (this.props.value.public_id !== nextProps.value.public_id) {
			this.setState({
				removeExisting: false,
				userSelectedFile: null,
				selectValue: null,
			});
		}
	},

	// ==============================
	// HELPERS
	// ==============================

	hasLocal () {
		return !!this.state.userSelectedFile;
	},
	hasExisting () {
		return !!(this.props.value && this.props.value.url);
	},
	hasImage () {
		return this.hasExisting() || this.hasLocal();
	},
	getFilename () {
		const { format, height, public_id, width, context } = this.props.value;

		let label = `${public_id}.${format} (${width}×${height})`;
		if (context && context.custom.filename) {
			label = `${context.custom.filename} (${width}×${height})`;
		}

		return this.state.userSelectedFile ? this.state.userSelectedFile.name : label;
	},
	getImageSource (height = 90) {
		// TODO: This lets really wide images break the layout
		let src;
		if (this.hasLocal()) {
			src = this.state.dataUri;
		} else if (this.hasExisting()) {
			src = cloudinaryResize(this.props.value.public_id, {
				crop: 'fit',
				height: height,
				format: 'jpg',
				secure: this.props.secure,
			});
		}

		return src;
	},
	getSelectIcon (resource_type) {
		switch (resource_type) {
			case 'pdf':
				return 'file-pdf';
			case 'video':
				return 'device-camera-video';
			case 'image':
			default:
				return 'file-media';
		}
	},

	// ==============================
	// METHODS
	// ==============================

	triggerFileBrowser () {
		this.refs.fileInput.clickDomNode();
	},
	handleFileChange (event) {
		const userSelectedFile = event.target.files[0];

		this.setState({ userSelectedFile });
	},

	// Toggle the lightbox
	openLightbox (event) {
		event.preventDefault();
		this.setState({
			lightboxIsVisible: true,
		});
	},
	closeLightbox () {
		this.setState({
			lightboxIsVisible: false,
		});
	},

	// Handle image selection in file browser
	handleImageChange (e) {
		if (!window.FileReader) {
			return alert('File reader not supported by browser.');
		}

		var reader = new FileReader();
		var file = e.target.files[0];
		if (!file) return;

		if (!file.type.match(SUPPORTED_REGEX)) {
			return alert('Unsupported file type. Supported formats are: GIF, PNG, JPG, BMP, ICO, PDF, TIFF, EPS, PSD, SVG');
		}

		reader.readAsDataURL(file);

		reader.onloadstart = () => {
			this.setState({
				loading: true,
			});
		};
		reader.onloadend = (upload) => {
			this.setState({
				dataUri: upload.target.result,
				loading: false,
				userSelectedFile: file,
			});
			this.props.onChange({ file: file });
		};
	},

	// If we have a local file added then remove it and reset the file field.
	handleRemove (e) {
		var state = {};

		if (this.state.userSelectedFile) {
			state.userSelectedFile = null;
		} else if (this.hasExisting()) {
			state.removeExisting = true;
		}

		this.setState(state);
	},
	undoRemove () {
		this.setState(buildInitialState(this.props));
	},

	// ==============================
	// RENDERERS
	// ==============================

	renderLightbox () {
		const { value } = this.props;

		if (!value || !value.public_id) return;

		return (
			<Lightbox
				currentImage={0}
				images={[{ src: this.getImageSource(600) }]}
				isOpen={this.state.lightboxIsVisible}
				onClose={this.closeLightbox}
				showImageCount={false}
			/>
		);
	},
	renderImagePreview () {
		const { value } = this.props;

		// render icon feedback for intent
		let mask;
		if (this.hasLocal()) mask = 'upload';
		else if (this.state.removeExisting) mask = 'remove';
		else if (this.state.loading) mask = 'loading';

		const shouldOpenLightbox = value.format !== 'pdf';

		return (
			<ImageThumbnail
				component="a"
				href={this.getImageSource(600)}
				onClick={shouldOpenLightbox && this.openLightbox}
				mask={mask}
				target="__blank"
				style={{ float: 'left', marginRight: '1em' }}
			>
				<img src={this.getImageSource()} style={{ height: 90 }} />
			</ImageThumbnail>
		);
	},
	renderOption (option, isValue) {
		const className = `octicon octicon-${this.getSelectIcon(option.resource_type)}`;
		const styles = {
			image: {
				height: isValue ? 24 : 50,
				width: isValue ? 48 : 100,
				marginRight: '1em',
			},
			glyph: {
				paddingRight: '0.5em',
			},
		};
		let label = option.label;
		if (option.filename) {
			label = option.filename;
		}
		return (
			<div>
				<img alt={label} src={option.thumbnail} style={styles.image} />
				<span><i style={styles.glyph} className={className} />{label}</span>
			</div>
		);
	},
	handleSelectOnChange (option) {
		this.setState({ selectValue: option ? option.value : null });
	},
	handleLoadOptions (input, callback) {
		const { listPath, path } = this.props;

		let prefix = Keystone.options.cloudinaryPrefix ? `${Keystone.options.cloudinaryPrefix}/` : '';
		prefix += `${listPath}/${path}`;

		$.get('/keystone/api/cloudinary/autocomplete', {
			dataType: 'json',
			data: { q: input },
			prefix: prefix,
			max: 500,
		}, function (data) {
			var options = [];
			data.items.forEach(function (item) {
				options.push({
					value: `select:${item.public_id}`,
					label: item.public_id,
					resource_type: item.resource_type,
					thumbnail: item.thumbnail,
					filename: item.context && item.context.custom.filename,
				});
			});
			callback(null, {
				options: options,
				complete: true,
			});
		});
	},
	renderImageSelect () {
		const { path } = this.props;
		const { selectValue } = this.state;
		return (
			<Select.Async
				placeholder="Search for an image on Cloudinary ..."
				value={selectValue}
				name={this.getInputName(path)}
				optionRenderer={(o) => this.renderOption(o)}
				valueRenderer={(o) => this.renderOption(o, true)}
				loadOptions={this.handleLoadOptions}
				onChange={this.handleSelectOnChange}
			/>
		);
	},
	renderFileNameAndOptionalMessage (showChangeMessage = false) {
		return (
			<div>
				{this.hasImage() ? (
					<FileChangeMessage>
						{this.getFilename()}
					</FileChangeMessage>
				) : null}
				{showChangeMessage && this.renderChangeMessage()}
			</div>
		);
	},
	renderChangeMessage () {
		if (this.state.userSelectedFile) {
			return (
				<FileChangeMessage color="success">
					Save to Upload
				</FileChangeMessage>
			);
		} else if (this.state.removeExisting) {
			return (
				<FileChangeMessage color="danger">
					Save to Remove
				</FileChangeMessage>
			);
		} else {
			return null;
		}
	},

	// Output [cancel/remove/undo] button
	renderClearButton () {
		const clearText = this.hasLocal() ? 'Cancel' : 'Remove Image';

		return this.state.removeExisting ? (
			<Button variant="link" onClick={this.undoRemove}>
				Undo Remove
			</Button>
		) : (
			<Button variant="link" color="cancel" onClick={this.handleRemove}>
				{clearText}
			</Button>
		);
	},

	renderImageToolbar () {
		return (
			<div key={this.props.path + '_toolbar'} className="image-toolbar">
				<Button
					onClick={this.triggerFileBrowser}
					disabled={this.state.removeExisting}
				>
					{this.hasImage() ? 'Change' : 'Upload'} Image
				</Button>
				{this.hasImage() ? this.renderClearButton() : null}
			</div>
		);
	},

	renderFileInput () {
		if (!this.shouldRenderField()) return null;

		return (
			<HiddenFileInput
				accept={SUPPORTED_TYPES.join()}
				ref="fileInput"
				name={this.state.uploadFieldPath}
				onChange={this.handleImageChange}
			/>
		);
	},

	renderActionInput () {
		if (!this.shouldRenderField()) return null;

		if (this.state.userSelectedFile || this.state.removeExisting) {
			const value = this.state.userSelectedFile
				? `upload:${this.state.uploadFieldPath}`
				: 'delete';
			return (
				<input
					name={this.getInputName(this.props.path)}
					type="hidden"
					value={value}
				/>
			);
		} else {
			return null;
		}
	},

	renderUI () {
		const { label, note, path, select } = this.props;

		const imageContainer = (
			<div style={this.hasImage() ? { marginBottom: '1em' } : null}>
				{this.hasImage() && this.renderImagePreview()}
				{this.hasImage() && this.renderFileNameAndOptionalMessage(this.shouldRenderField())}
			</div>
		);

		const toolbar = this.shouldRenderField()
			? this.renderImageToolbar()
			: <FormInput noedit />;

		return (
			<FormField label={label} className="field-type-cloudinaryimage" htmlFor={path}>
				{!!select && this.renderImageSelect()}
				{imageContainer}
				{toolbar}
				{!!note && <FormNote note={note} />}
				{this.renderLightbox()}
				{this.renderFileInput()}
				{this.renderActionInput()}
			</FormField>
		);
	},
});
