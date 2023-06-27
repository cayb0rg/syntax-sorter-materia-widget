import React, { useState, useContext, useRef, useEffect } from 'react'
import { store } from '../../player-store'

const Token = (props) => {

	const manager = useContext(store)
	const dispatch = manager.dispatch

	const tokenRef = useRef(null)
	const coords = tokenRef.current?.getBoundingClientRect()

	const [state, setState] = useState({ dragging: false, origin: null })

	// update token position when element's x value changes
	useEffect(() => {
		if (props.status == 'sorted' && coords && coords.x > 0) {
			dispatch({
				type: 'token_update_position', payload: {
					questionIndex: manager.state.currentIndex,
					tokenIndex: props.index,
					x: coords.x,
					y: coords.y + coords.height / 2,
					width: coords.width
				}
			})
		}
	}, [coords?.x])

	useEffect(() => {
		if (props.focus && tokenRef.current) {
			tokenRef.current.focus()
		}
		else if (tokenRef.current)
		{
			tokenRef.current.blur()
		}
	}, [props.focus])

	const handleFocus = () => {
		dispatch({
			type: 'toggle_token_select', payload: {
				questionIndex: manager.state.currentIndex,
				tokenIndex: props.index,
				origin: props.status,
				id: props.id
			}
		})
	}

	// the above hook works MOST of the time, but certain events (token rearrange) clear this token's position information in the store, and the hook doesn't fire
	// manually update the position in cases where the position value does not get updated after being cleared
	// useEffect( () => {
	// 	if (props.status == 'sorted' && !props.position.x && coords) {
	// 		dispatch({type:'token_update_position',payload: {
	// 			questionIndex: manager.state.currentIndex,
	// 			tokenIndex: props.index,
	// 			x: coords.x,
	// 			y: coords.y + coords.height/2,
	// 			width: coords.width
	// 		}})

	// 		props.forceClearAdjacentTokens()
	// 	}
	// }, [props.position])

	// a token was sorted or rearranged, prompting the reqPositionUpdate flag to update for all sorted tokens. This forces them to update their position information
	// in scenarios where it wouldn't otherwise get updated
	useEffect(() => {
		if (props.status == 'sorted' && props.reqPositionUpdate == true && coords) {
			dispatch({
				type: 'token_update_position', payload: {
					questionIndex: manager.state.currentIndex,
					tokenIndex: props.index,
					x: coords.x,
					y: coords.y + coords.height / 2,
					width: coords.width
				}
			})

			props.forceClearAdjacentTokens()
		}
	}, [props?.reqPositionUpdate])

	const getLegendColor = (type) => {
		for (const term of manager.state.legend) {
			if (type == term.id) return term.color
		}
		return '#ffffff'
	}

	const getLegendName = (type) => {
		for (const term of manager.state.legend) {
			if (type == term.id) return term.name
		}
	}

	const handleDragStart = (event) => {

		setState(state => ({ ...state, origin: props.status }))

		event.dataTransfer.dropEffect = "move"
		event.dataTransfer.setData("tokenName", props.value)
		event.dataTransfer.setData("tokenType", props.type)
		event.dataTransfer.setData("tokenPhraseIndex", props.index)
		event.dataTransfer.setData("tokenStatus", props.status)
		event.dataTransfer.setData("tokenId", props.id)

		setTimeout(() => {
			setState(state => ({ ...state, dragging: true }))
		})

		dispatch({
			type: 'token_dragging', payload: {
				questionIndex: manager.state.currentIndex,
				tokenIndex: props.index,
				status: props.status
			}
		})
	}

	// likely unneeded
	const handleDrag = (event) => {
	}

	const handleClick = (event) => {

		// Gets the right click
		if (event.nativeEvent.which === 3) {
	  	event.preventDefault();

	  	if (!props.dragEligible) return

	  	if (props.status == "sorted")
	  	{
	  		dispatch({type: 'sorted_token_unsort', payload: {
					origin: state.origin,
					tokenIndex: props.index,
					questionIndex: manager.state.currentIndex,
					fakeout: props.fakeout,
					legend: props.type,
					value: props.value,
					id: props.id
				}})
	  	}
	  }
	}

	const handleDragEnd = (event) => {

		dispatch({
			type: 'token_drag_complete', payload: {
				origin: state.origin,
				status: props.status,
				tokenIndex: props.index,
				questionIndex: manager.state.currentIndex,
				fakeout: props.fakeout,
				id: props.id
			}
		})

		setTimeout(() => {
			setState(state => ({ ...state, dragging: false }))
		})
	}

	const handleKeyDown = (event) => {
		// Listen for space or enter key
		// to move token in and out of token drawer
		if (event.type == "keydown" && (event.key == " " || event.key == "Enter") || event.type == "click") {
			event.preventDefault();

			let sorted = manager.state.items[manager.state.currentIndex]?.sorted;
			let sortedLengthPrior = sorted.length;

			let phrase = manager.state.items[manager.state.currentIndex]?.phrase;
			let phraseLengthPrior = phrase.length;

			if (!props.dragEligible) return

			let index = sorted ? sorted.length : 0;

			if (props.status == 'unsorted')
			{
				// Move token to end of box
				dispatch({
					type: 'response_token_sort',
					payload: {
						questionIndex: manager.state.currentIndex,
						targetIndex: index,
						id: props.id,
						legend: props.type,
						value: props.value,
						phraseIndex: props.index,
						fakeout: props.fakeout
					}
				})
				if (phraseLengthPrior < 2)
				{
					// Switch focus to box
					dispatch({
						type: 'toggle_token_select', payload: {
							questionIndex: manager.state.currentIndex,
							tokenIndex: index,
							origin: 'sorted',
							id: props.id
						}
					})
					dispatch({
						type: 'set_live_region', payload: `All tokens have been sorted`
					})
				}
				else
				{
					// Get next focus in phrase
					let focusIndex = props.index > phraseLengthPrior - 2 ? props.index - 1 : props.index;
					dispatch({
						type: 'toggle_token_select', payload: {
							questionIndex: manager.state.currentIndex,
							tokenIndex: focusIndex,
							origin: props.status,
							id: props.id
						}
					})

					// dispatch({
					// 	type: 'set_live_region', payload: `${manager.state.items[manager.state.currentIndex].sorted.length + 1} of ${manager.state.items[manager.state.currentIndex].correctPhrase.length} tokens sorted.`
					// })
				}
			}
			else if (props.status == 'sorted')
			{
				// Move token out of box, to end of token list
				dispatch({type: 'sorted_token_unsort', payload: {
					origin: state.origin,
					tokenIndex: props.index,
					questionIndex: manager.state.currentIndex,
					fakeout: props.fakeout,
					legend: props.type,
					value: props.value,
					id: props.id
				}})
				if (sortedLengthPrior < 2)
				{
					// Switch focus to phrase
					dispatch({
						type: 'toggle_token_select', payload: {
							questionIndex: manager.state.currentIndex,
							tokenIndex: 0,
							origin: 'unsorted',
							id: props.id
						}
					})
					dispatch({
						type: 'set_live_region', payload: `All tokens have been unsorted`
					})
				}
				else
				{
					// Get next focus in box
					let focusIndex = props.index > sortedLengthPrior - 2 ? props.index - 1 : props.index;
					dispatch({
						type: 'toggle_token_select', payload: {
							questionIndex: manager.state.currentIndex,
							tokenIndex: focusIndex,
							origin: props.status,
							id: props.id
						}
					})
				}
			}
		}
		// Listen to "Q" and "E"
		else if (event.key == "q" || event.key == "e" || event.key == "Q" || event.key == "E")
		{
			event.preventDefault();
			// First check to make sure it's in box
			if (props.status != 'sorted')
				return;

			// Determine the direction to move
			let targetIndex = event.key == "q" || event.key == "Q" ? props.index - 1 : props.index + 2;

			let sorted = manager.state.items[manager.state.currentIndex]?.sorted;

			// If index is out of range, do nothing
			if (targetIndex < 0 || targetIndex > sorted.length)
				return;

			dispatch({
				type: 'response_token_rearrange',
				payload: {
					questionIndex: manager.state.currentIndex,
					targetIndex: targetIndex,
					id: props.id,
					legend: props.type,
					value: props.value,
					originIndex: props.index,
					fakeout: props.fakeout
				}
			})

			let focusIndex = event.key == "q" || event.key == "Q" ? props.index - 1 : props.index + 1;
			dispatch({
				type: 'toggle_token_select', payload: {
					questionIndex: manager.state.currentIndex,
					tokenIndex: focusIndex,
					origin: props.status,
					id: props.id
				}
			})
		}
	}

	// function that returns a value 0-255 based on the "lightness" of a given hex value
	const contrastCalc = (color) => {
		var r, g, b
		var m = color.substr(1).match(color.length == 7 ? /(\S{2})/g : /(\S{1})/g)
		if (m) {
			r = parseInt(m[0], 16)
			g = parseInt(m[1], 16)
			b = parseInt(m[2], 16)
		}
		if (typeof r != "undefined") return ((r * 299) + (g * 587) + (b * 114)) / 1000;
	}

	let tokenColor = getLegendColor(props.type)

	// Word value (optional), legend name, position, sorted or unsorted
	let ariaLabel = (props.pref == 'word' ? `${props.value}, type: ${getLegendName(props.type)}, ` : getLegendName(props.type) + ', ') + (props.status == "sorted" ? `sorted in position ${props.index + 1} ` : props.status);

	return (
		<button className={`token ${state.dragging ? 'dragging' : ''} ${props.arrangement == 'left' ? 'is-left' : ''} ${props.arrangement == 'right' ? 'is-right' : ''}`}
			style={{
				background: tokenColor,
				color: contrastCalc(tokenColor) > 160 ? '#000000' : '#ffffff',
				display: props.status == "relocated" ? "none" : "inline-block"
			}}
			ref={tokenRef}
			draggable={props.dragEligible}
			onDragStart={handleDragStart}
			onDrag={handleDrag}
			onDragEnd={handleDragEnd}
			onContextMenu={handleClick}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onClick={handleKeyDown}
			aria-label={ariaLabel}
			>
			{props.pref == 'word' ? props.value : getLegendName(props.type)}
		</button>
	)
}

export default Token
