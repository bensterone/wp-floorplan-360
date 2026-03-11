/**
 * Floorplan 360 Viewer — Block Editor Component
 *
 * Build this file with:  npm run build
 * Output goes to:        assets/js/block-editor.js
 */

import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Placeholder, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

registerBlockType( 'floorplan-360/viewer', {

	edit: function Edit( { attributes, setAttributes } ) {
		const { floorplanId } = attributes;
		const blockProps = useBlockProps();

		// Fetch all published floorplan posts for the dropdown
		const floorplans = useSelect( ( select ) => {
			return select( 'core' ).getEntityRecords( 'postType', 'floorplan', {
				per_page: 100,
				status:   'publish',
			} );
		}, [] );

		// Build the dropdown options
		const options = [
			{ label: __( '— Select a Floorplan —', 'wp-floorplan-360' ), value: 0 },
			...( floorplans || [] ).map( ( post ) => ( {
				label: post.title.rendered || __( '(no title)', 'wp-floorplan-360' ),
				value: post.id,
			} ) ),
		];

		// Still loading
		if ( ! floorplans ) {
			return (
				<div { ...blockProps }>
					<Placeholder
						icon="admin-home"
						label={ __( 'Floorplan 360 Viewer', 'wp-floorplan-360' ) }
					>
						<Spinner />
					</Placeholder>
				</div>
			);
		}

		// No floorplans exist yet
		if ( floorplans.length === 0 ) {
			return (
				<div { ...blockProps }>
					<Placeholder
						icon="admin-home"
						label={ __( 'Floorplan 360 Viewer', 'wp-floorplan-360' ) }
						instructions={ __(
							'No floorplans found. Create one under Floorplans > Add New first.',
							'wp-floorplan-360'
						) }
					/>
				</div>
			);
		}

		return (
			<>
				{ /* Inspector panel — the sidebar controls */ }
				<InspectorControls>
					<PanelBody title={ __( 'Floorplan Settings', 'wp-floorplan-360' ) }>
						<SelectControl
							label={ __( 'Select Floorplan', 'wp-floorplan-360' ) }
							value={ floorplanId }
							options={ options }
							onChange={ ( val ) => setAttributes( { floorplanId: Number( val ) } ) }
						/>
					</PanelBody>
				</InspectorControls>

				{ /* Editor preview area */ }
				<div { ...blockProps }>
					{ floorplanId === 0 ? (
						<Placeholder
							icon="admin-home"
							label={ __( 'Floorplan 360 Viewer', 'wp-floorplan-360' ) }
							instructions={ __(
								'Choose a floorplan from the block settings panel on the right.',
								'wp-floorplan-360'
							) }
						/>
					) : (
						<div className="fp360-block-preview">
							<span className="fp360-block-preview__icon dashicons dashicons-admin-home"></span>
							<span className="fp360-block-preview__label">
								{ __( 'Floorplan 360 Viewer', 'wp-floorplan-360' ) }
								{ ': ' }
								{ options.find( ( o ) => o.value === floorplanId )?.label }
							</span>
						</div>
					) }
				</div>
			</>
		);
	},

	// No save function — output is handled server-side by render_callback in Block.php
	save: () => null,
} );
