(function() {
	var storedRolls = localStorage.getItem('quickRolls'),
		quickRolls = (storedRolls) ? JSON.parse(storedRolls) : [],
		groups = getGroups(quickRolls),
		rollToSave,
		rollInput = document.getElementById('roll'),
		keepInput = document.getElementById('keep'),
		bonusInput = document.getElementById('bonus'),
		explodeInput = document.getElementById('explode'),
		rerollInput = document.getElementById('reroll'),
		actualRolledOutput = document.querySelector('#output .actual-rolled'),
		totalOutput = document.querySelector('#output .total'),
		detailOutput = document.querySelector('#output .detail'),
		rollButton = document.getElementById('doIt'),

		quickRollsButton = document.getElementById('quickRollsButton'),
		quickRollsModal = document.getElementById('quickRollsModal'),
		quickRollsList = quickRollsModal.querySelector('.list'),

		saveButton = document.getElementById('saveIt'),
		saveModal = document.getElementById('saveModal'),
		confirmSaveButton = document.getElementById('confirmSave'),
		cancelSaveButton = document.getElementById('cancelSave'),
		nameInput = document.getElementById('nameInput'),
		groupInput = document.getElementById('groupInput'),
		blanket = document.getElementById('blanket');

	function clearResults() {
		actualRolledOutput.innerHTML = '';
		totalOutput.innerHTML = '';
		detailOutput.innerHTML = '';
	}

	function getGroups(rolls) {
		var groups = [];

		quickRolls.forEach(function(r) {
			if (groups.indexOf(r.group) < 0) {
				groups.push(r.group);
			}
		});

		return groups.sort();
	}

	function getRollsInGroup(group) {
		return quickRolls.filter(function(r) {
			return r.group === group;
		}).sort(function(a, b) {
			return a.name.localeCompare(b.name);
		});
	}

	function getRollObject() {
		return {
			roll: parseInt(rollInput.value),
			keep: parseInt(keepInput.value),
			bonus: parseInt(bonusInput.value),
			explode: !!explodeInput.checked,
			reroll: !!rerollInput.checked
		};
	}

	function updateRollInterface(rollObject) {
		clearResults();

		rollInput.value = rollObject.roll;
		keepInput.value = rollObject.keep;
		bonusInput.value = rollObject.bonus;
		explodeInput.checked = (rollObject.explode) ? 'checked' : false;
		rerollInput.checked = (rollObject.reroll) ? 'checked' : false;

		if (rollObject.name) {
			nameInput.value = rollObject.name;
		}

		if (rollObject.group) {
			groupInput.value = rollObject.group;
		}
	}

	function d10() {
		return Math.floor(Math.random() * 10) + 1;
	}

	function doExplode(val) {
		if (val === 10) {
			return val + doExplode(d10());
		} else {
			return val;
		}
	}

	function checkReroll(val) {
		return val === 1;
	}

	function doReroll(val) {
		if (val === 1) {
			return d10();
		} else {
			return val;
		}
	}

	function sum(a, b) {
		return a + b;
	}

	function makeDie(val) {
		var split = splitDie(val),
			out = split.map(function(val) {
				return `<span class="output-die"><span class="output-die-value">${val % 10}</span></span>`;
			}).join('<span class="output-text">+</span>');

			out += `<span class="output-total-die-value">${val}</span>`;

		return out;
	}

	function splitDie(val) {
		var split = [];

		while (val > 10) {
			split.push(10);
			val -= 10;
		}

		split.push(val);

		return split;
	}

	function roll(config) {
		var toRoll = config.roll,
			toKeep = config.keep,
			bonus = config.bonus,
			explode = config.explode,
			reroll = config.reroll,
			spread = [],
			rerolled = [],
			keep = [],
			rolled = 0,
			total = 0,
			totalString = '',
			bonusString;

		// Can't roll more than 10 dice in l54 4E
		// Every 2 on top of that is +1 kept die
		if (toRoll > 10) {
			toKeep += Math.floor((toRoll - 10) / 2);
			toRoll = 10;
		}

		// Create an array with the right number of items,
		// fill it with anything so map works, and then
		// roll a d10 for each item
		spread = (new Array(toRoll)).fill(0).map(d10);

		// If we're rerolling 1's for emphases, do that
		// first. We track which initial rolls were 1's
		// so we can display that in the interface
		if (reroll) {
			rerolled = spread.map(checkReroll);
			spread = spread.map(doReroll);
		}

		// If' we're exploding 10's, run doExplode
		// on each value. This continues to reroll until
		// a non-10 is rolled. Theoretically, this could
		// go infinite in very rare circumstances.
		if (explode) {
			spread = spread.map(doExplode);
		}

		// Sort the array numerically. JS sorts alphabetically
		// by default even when the array is all numemric. Oh well.
		spread = spread.sort(function(a, b) {
			return b - a;
		});

		// Get the kept dice, the total rolled on those dice
		// and the total after bonuses
		keep = spread.slice(0, toKeep);
		rolled = keep.reduce(sum, 0);
		total = rolled + bonus;

		actualRolledOutput.innerHTML = `Rolled <span class="actual-rolled">${toRoll}</span>, kept <span class="actual-kept">${toKeep}</span>`;

		// Make the roll output. If there are no bonuses, it's just the total
		totalString = `<div class="output-section output-section-total">
				<div class="output-header">Total</div>
				<div class="output-value output-total">${total}</div>
			</div>`;

		// If there is a bonus, we add the roll and the bonus to the interface
		if (bonus) {
			if (bonus > 0) {
				bonusString = 'Bonus';
			} else {
				bonusString = 'Penalty';
			}

			totalString = `<div class="output-section output-section-rolled">
					<div class="output-header">Rolled</div>
					<div class="output-value output-rolled">${rolled}</div>
				</div>
				<div class="output-section output-section-plus">
					<div>+</div>
				</div>
				<div class="output-section output-section-bonus">
					<div class="output-header">${bonusString}</div>
					<div class="output-value output-bonus">${bonus}</div>
				</div>
				<div class="output-section output-section-equals">
					<div>=</div>
				</div>
				` + totalString;

			totalOutput.classList.add('bonus');
		} else {
			totalOutput.classList.remove('bonus');
		}

		totalOutput.innerHTML = totalString;

		// Make the per-die output
		detailOutput.innerHTML = spread.map(function(val, index) {
			var keepClass = (index < toKeep) ? 'kept' : 'unkept',
				rerollClass = (rerolled[index]) ? 'rerolled' : '',
				tags = [];

			if (val >= 10) {
				tags.push('exploded');
			}

			if (rerolled[index]) {
				tags.push('rerolled');
			}

			if (index < toKeep) {
				tags.push('kept');
			} else {
				tags.push('unkept');
			}

			return `<div class="output ${keepClass} ${rerollClass}">
					${makeDie(val)}
					<div class="output-tags">${tags.join(', ')}</div>
				</div>`;
		}).join('');
	}

	function makeMinZeroHandler(input) {
		return function() {
			console.log('change');
			if (parseInt(input.value) < 0) {
				input.value = 0;
			}
		};
	}

	function makeMaxRollHandler(input) {
		return function() {
			console.log('change');
			if (parseInt(input.value) > parseInt(rollInput.value)) {
				input.value = rollInput.value;
			}
		};
	}

	function makeFocusHandler(input) {
		return function() {
			input.dataset.oldValue = input.value;
			input.value = '';
		};
	}

	function makeBlurHandler(input) {
		return function() {
			if (input.value === '' && (input.dataset.oldValue || input.dataset.oldValue === 0)) {
				input.value = input.dataset.oldValue;
			}

			input.dataset.oldValue = null;
		}
	}

	function showQuickRolls() {
		var groups = getGroups(quickRolls);

		quickRollsList.innerHTML = '';

		groups.forEach(function(group) {
			var rolls = getRollsInGroup(group),
				groupContainer = document.createElement('div'),
				groupHeader = document.createElement('h2');

			groupHeader.appendChild(document.createTextNode(group));
			groupContainer.appendChild(groupHeader);

			rolls.forEach(function(quickRoll) {
				var container = document.createElement('div'),
					buttonsContainer = document.createElement('div')
					quickRollButton = document.createElement('span'),
					voidRollButton = document.createElement('span'),
					deleteButton = document.createElement('span');

				container.className = 'quick-roll';
				quickRollButton.className = 'fas fa-hand-holding button quick-roll-button';
				voidRollButton.className = 'fas fa-hand-holding-medical button void-roll-button';
				deleteButton.className = 'fas fa-trash delete-button';

				buttonsContainer.appendChild(quickRollButton);
				buttonsContainer.appendChild(voidRollButton);
				buttonsContainer.className = 'quick-roll-buttons';

				container.appendChild(buttonsContainer);
				container.appendChild(document.createTextNode(quickRoll.name));
				container.appendChild(deleteButton);

				groupContainer.appendChild(container);

				quickRollButton.addEventListener('click', function() {
					blanket.style.display = 'none';
					quickRollsModal.style.display = 'none';

					updateRollInterface(quickRoll);
				});

				voidRollButton.addEventListener('click', function() {
					var voidRoll = Object.assign({}, quickRoll);
					voidRoll.roll += 1;
					voidRoll.keep += 1;
					blanket.style.display = 'none';
					quickRollsModal.style.display = 'none';

					updateRollInterface(voidRoll);
				});

				deleteButton.addEventListener('click', function() {
					quickRolls = quickRolls.filter(function(filterRoll) {
						return filterRoll.name !== quickRoll.name || filterRoll.group !== quickRoll.group;
					});

					localStorage.setItem('quickRolls', JSON.stringify(quickRolls));

					blanket.style.display = 'none';
					quickRollsModal.style.display = 'none';

					if (quickRolls.length === 0) {
						quickRollsButton.style.display = 'none';
					}
				});
			});

			quickRollsList.appendChild(groupContainer);
		});

		blanket.style.display = 'block';
		quickRollsModal.style.display = 'block';
	}

	function showSaveModal() {
		var rollString = rollToSave.roll + 'k' + rollToSave.keep + '+' + rollToSave.bonus,
			bonusStrings = [];

		if (rollToSave.explode) {
			bonusStrings.push('Explode 10s');
		} else {
			bonusStrings.push('Do not explode 10s');
		}

		if (rollToSave.reroll) {
			bonusStrings.push('Reroll 1s')
		} else {
			bonusStrings.push('Do not reroll 1s');
		}

		saveModal.querySelector('.summary').innerHTML = `<div>Roll: ${rollString}</div><div>${bonusStrings.join(', ')}</div>`;

		if (rollToSave.name) {
			nameInput.value = rollToSave.name;
		}

		if (rollToSave.group) {
			groupInput.value = rollToSave.group;
		}

		saveModal.style.display = 'block';
		blanket.style.display = 'block';
	}

	rollInput.addEventListener('focus', makeFocusHandler(rollInput));
	keepInput.addEventListener('focus', makeFocusHandler(keepInput));
	bonusInput.addEventListener('focus', makeFocusHandler(bonusInput));
	
	rollInput.addEventListener('blur', makeBlurHandler(rollInput));
	keepInput.addEventListener('blur', makeBlurHandler(keepInput));
	bonusInput.addEventListener('blur', makeBlurHandler(bonusInput));

	rollInput.addEventListener('change', makeMinZeroHandler(rollInput));
	keepInput.addEventListener('change', makeMinZeroHandler(keepInput));

	rollInput.addEventListener('change', makeMaxRollHandler(keepInput));
	keepInput.addEventListener('change', makeMaxRollHandler(keepInput));

	rollButton.addEventListener('click', function() {
		roll(getRollObject());
	});

	saveButton.addEventListener('click', function() {
		rollToSave = getRollObject();
		showSaveModal();
	});

	confirmSaveButton.addEventListener('click', function() {
		var doSave = true;

		if (rollToSave) {
			if (nameInput.value && groupInput.value) {
				var updated = false;

				nameInput.classList.remove('error');
				groupInput.classList.remove('error');

				rollToSave.name = nameInput.value;
				rollToSave.group = groupInput.value;

				quickRolls = quickRolls.map(function(quickRoll) {
					if (quickRoll.name === rollToSave.name && quickRoll.group === rollToSave.group) {
						updated = true;
						return rollToSave;
					} else {
						return quickRoll;
					}
				});

				if (!updated) {
					quickRolls.push(rollToSave);
				}

				rollToSave = null;
				saveModal.style.display = 'none';
				blanket.style.display = 'none';
				quickRollsButton.style.display = 'block';

				localStorage.setItem('quickRolls', JSON.stringify(quickRolls));
			} else {
				 if (!nameInput.value) {
				 	nameInput.classList.add('error');
				 }

				 if (!groupInput.value) {
				 	groupInput.classList.add('error');
				 }
			}
		}
	});

	cancelSaveButton.addEventListener('click', function() {
		rollToSave = null;
		saveModal.style.display = 'none';
		blanket.style.display = 'none';
	});

	blanket.addEventListener('click', function() {
		saveModal.style.display = 'none';
		blanket.style.display = 'none';
		quickRollsModal.style.display = 'none';
	});

	quickRollsButton.addEventListener('click', showQuickRolls);

	if (quickRolls.length) {
		quickRollsButton.style.display = 'block';
	} else {
		quickRollsButton.style.display = 'none';
	}
})();