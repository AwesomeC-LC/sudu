document.addEventListener('DOMContentLoaded', () => {
    const menuScreen = document.getElementById('menu-screen');
    const gameArea = document.getElementById('game-area');
    const tutorialArea = document.getElementById('tutorial-area');
    const settingsArea = document.getElementById('settings-area');

    const sudokuBoardEl = document.getElementById('sudoku-board');
    const numberSelector = document.getElementById('number-selector');
    const messageArea = document.getElementById('message-area');
    const timeElapsedDisplay = document.getElementById('time-elapsed');

    const completionModal = document.getElementById('completion-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const starsEarnedDisplay = document.getElementById('stars-earned');
    const gameStatsDisplay = document.getElementById('game-stats');

    // 获取需要操作的按钮
    const checkButton = document.getElementById('check-button');
    const hintButton = document.getElementById('hint-button');
    const eraseButton = document.getElementById('erase-button');
    const newGameButtonControls = document.getElementById('new-game-button');
    const backToMenuButton = document.getElementById('back-to-menu-button');
    const closeTutorialButton = document.getElementById('close-tutorial-button');
    const playAgainButton = document.getElementById('play-again-button');
    const modalBackToMenuButton = document.getElementById('modal-back-to-menu-button');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const settingsBackButton = document.getElementById('settings-back-button');
    const checkLimitInput = document.getElementById('check-limit-input');
    const hintLimitInput = document.getElementById('hint-limit-input');


    let currentDifficulty = null;
    let boardSize = 9;
    let subgridSize = 3;

    let selectedCell = null;
    let timerInterval = null;
    let secondsElapsed = 0;

    let currentPuzzle = [];
    let currentSolution = [];
    let userBoard = [];

    // --- 新增：设置和使用次数追踪 ---
    let maxChecks = Infinity;
    let maxHints = Infinity;
    let checksUsed = 0;
    let hintsUsed = 0;

    // --- 事件监听器 ---
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const difficulty = e.target.dataset.difficulty;

            menuScreen.style.display = 'none';
            tutorialArea.style.display = 'none';
            gameArea.style.display = 'none';
            settingsArea.style.display = 'none';
            completionModal.classList.remove('show');

            if (action === 'tutorial') {
                showTutorial();
            } else if (action === 'settings') {
                showSettings();
            } else if (difficulty) {
                currentDifficulty = difficulty;
                startGame(difficulty);
            }
        });
    });

    closeTutorialButton.addEventListener('click', () => {
        tutorialArea.style.display = 'none';
        menuScreen.style.display = 'block';
    });
    
    // 新增：设置界面按钮事件
    saveSettingsButton.addEventListener('click', () => {
        const checkVal = parseInt(checkLimitInput.value, 10);
        const hintVal = parseInt(hintLimitInput.value, 10);

        maxChecks = (checkVal > 0) ? checkVal : Infinity;
        maxHints = (hintVal > 0) ? hintVal : Infinity;

        alert(`设置已保存！\n检查次数: ${maxChecks === Infinity ? '无限' : maxChecks}\n提示次数: ${maxHints === Infinity ? '无限' : maxHints}`);
        
        settingsArea.style.display = 'none';
        menuScreen.style.display = 'block';
    });

    settingsBackButton.addEventListener('click', () => {
        settingsArea.style.display = 'none';
        menuScreen.style.display = 'block';
    });


    backToMenuButton.addEventListener('click', goBackToMenu);

    // 游戏控制区按钮事件
    if (checkButton) {
        checkButton.addEventListener('click', () => {
            // 新增：检查使用次数限制
            if (checksUsed >= maxChecks) {
                messageArea.textContent = `检查次数已用完！(${checksUsed}/${maxChecks})`;
                return;
            }
            
            let errorsFound = 0;
            // 清除之前的错误高亮
            sudokuBoardEl.querySelectorAll('.sudoku-cell.error').forEach(cell => cell.classList.remove('error'));

            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    // 只检查用户填写的、非空的格子
                    if (userBoard[r][c] !== 0 && currentPuzzle[r][c] === 0) {
                        if (userBoard[r][c] !== currentSolution[r][c]) {
                            const cellElement = sudokuBoardEl.querySelector(`.sudoku-cell[data-row='${r}'][data-col='${c}']`);
                            if (cellElement) {
                                cellElement.classList.add('error');
                            }
                            errorsFound++;
                        }
                    }
                }
            }
            
            checksUsed++; // 增加使用次数
            const remainingChecks = maxChecks === Infinity ? '无限' : maxChecks - checksUsed;

            if (errorsFound > 0) {
                messageArea.textContent = `找到了 ${errorsFound} 个错误！剩余检查次数: ${remainingChecks}。`;
            } else {
                if (checkCompletion()) {
                    // 完成的逻辑由 checkCompletion 处理
                } else {
                     let allFilled = true;
                    for (let r_ = 0; r_ < boardSize; r_++) {
                        for (let c_ = 0; c_ < boardSize; c_++) {
                            if (userBoard[r_][c_] === 0) {
                                allFilled = false;
                                break;
                            }
                        }
                        if(!allFilled) break;
                    }
                    if (allFilled) {
                         messageArea.textContent = '棋盘已填满，但似乎还有未发现的错误！';
                    } else {
                         messageArea.textContent = `太棒了，目前没有发现错误！剩余检查次数: ${remainingChecks}。`;
                    }
                }
            }
        });
    }

    if (hintButton) {
        hintButton.addEventListener('click', () => {
            // 新增：检查使用次数限制
            if (hintsUsed >= maxHints) {
                messageArea.textContent = `提示次数已用完！(${hintsUsed}/${maxHints})`;
                return;
            }

            if (!currentSolution || currentSolution.length === 0) {
                messageArea.textContent = "抱歉，提示功能需要解答。";
                return;
            }
            let hintGiven = false;
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    if (userBoard[r][c] === 0 || (currentPuzzle[r][c] === 0 && userBoard[r][c] !== currentSolution[r][c])) {
                        const correctValue = currentSolution[r][c];
                        const cellElement = sudokuBoardEl.querySelector(`.sudoku-cell[data-row='${r}'][data-col='${c}']`);
                        if (cellElement) {
                            hintsUsed++; // 成功给出提示后才增加次数
                            const remainingHints = maxHints === Infinity ? '无限' : maxHints - hintsUsed;
                            cellElement.textContent = correctValue;
                            userBoard[r][c] = correctValue;
                            cellElement.classList.remove('error');
                            cellElement.classList.add('hinted');
                            setTimeout(() => cellElement.classList.remove('hinted'), 1500);

                            messageArea.textContent = `提示：(${r + 1}, ${c + 1}) 是 ${correctValue}。剩余提示: ${remainingHints}。`;
                            hintGiven = true;
                            checkCompletion();
                            return;
                        }
                    }
                }
            }
            if (!hintGiven) {
                messageArea.textContent = "棋盘已经正确填满或者没有更多提示了！";
            }
        });
    }

    if (eraseButton) {
        eraseButton.addEventListener('click', () => {
            if (selectedCell && !selectedCell.element.classList.contains('fixed')) {
                selectedCell.element.textContent = '';
                selectedCell.element.classList.remove('error');
                userBoard[selectedCell.row][selectedCell.col] = 0;
                messageArea.textContent = '已擦除';
            } else if (selectedCell && selectedCell.element.classList.contains('fixed')) {
                messageArea.textContent = '这是固定数字，不能擦除哦！';
            } else {
                messageArea.textContent = '请先选择一个要擦除的格子！';
            }
        });
    }

    if (newGameButtonControls) {
        newGameButtonControls.addEventListener('click', () => {
            if (currentDifficulty) startGame(currentDifficulty);
        });
    }

    // 弹窗按钮事件
    playAgainButton.addEventListener('click', () => {
        completionModal.classList.remove('show');
        if (currentDifficulty) startGame(currentDifficulty);
    });
    modalBackToMenuButton.addEventListener('click', () => {
        completionModal.classList.remove('show');
        goBackToMenu();
    });


    function showTutorial() {
        tutorialArea.style.display = 'block';
    }

    function showSettings() {
        settingsArea.style.display = 'block';
        checkLimitInput.value = maxChecks === Infinity ? '' : maxChecks;
        hintLimitInput.value = maxHints === Infinity ? '' : maxHints;
    }

    function goBackToMenu() {
        gameArea.style.display = 'none';
        tutorialArea.style.display = 'none';
        settingsArea.style.display = 'none';
        menuScreen.style.display = 'block';
        completionModal.classList.remove('show');
        stopTimer();
        clearBoardDisplay();
        selectedCell = null;
        messageArea.textContent = '';
    }

    function startGame(difficulty) {
        console.log(`正在开始游戏，难度: ${difficulty}`);
        // 新增：重置使用次数
        checksUsed = 0;
        hintsUsed = 0;

        gameArea.style.display = 'flex';
        messageArea.textContent = '游戏开始！点击格子选择数字。';
        setBoardParameters(difficulty);

        console.log(`棋盘大小设置为: ${boardSize}x${boardSize}`);

        const { puzzle, solution } = generateSudokuPuzzle(boardSize, difficulty);
        currentPuzzle = puzzle;
        currentSolution = solution;
        userBoard = currentPuzzle.map(row => [...row]);

        renderBoard();
        renderNumberSelector();
        startTimer();
    }

    function setBoardParameters(difficulty) {
        switch (difficulty) {
            case 'easy':
                boardSize = 4;
                subgridSize = 2;
                break;
            case 'medium':
                boardSize = 6;
                subgridSize = 0; // As per original code, CSS handles 6x6 subgrid visuals
                break;
            case 'hard': // 9x9 简单
            case 'expert': // 9x9 普通
            default:
                boardSize = 9;
                subgridSize = 3;
                break;
        }
        document.documentElement.style.setProperty('--board-size', boardSize);

        // --- Modified cellSize calculation for responsiveness ---
        let cellSize;
        const screenWidth = window.innerWidth;

        // Default PC sizes
        if (boardSize === 4) {
            cellSize = 70;
        } else if (boardSize === 6) {
            cellSize = 60;
        } else { // 9x9
            cellSize = 50;
        }

        // Adjust for smaller screens (cascade from smallest to largest or vice-versa)
        if (screenWidth < 480) { // Smallest screens (e.g., typical phones in portrait)
            if (boardSize === 4) {
                cellSize = Math.min(40, Math.floor(screenWidth * 0.85 / boardSize) - 4); // Target 40px, or calculated, minus padding/border
            } else if (boardSize === 6) {
                cellSize = Math.min(30, Math.floor(screenWidth * 0.88 / boardSize) - 3); // Target 30px
            } else { // 9x9
                cellSize = Math.min(28, Math.max(22, Math.floor(screenWidth * 0.93 / boardSize) - 2)); // Target 28px, min 22px, 93% width
            }
        } else if (screenWidth < 768) { // Medium screens (e.g., tablets, larger phones)
            if (boardSize === 4) {
                cellSize = Math.min(50, Math.floor(screenWidth * 0.9 / boardSize) - 4); // Target 50px
            } else if (boardSize === 6) {
                cellSize = Math.min(40, Math.floor(screenWidth * 0.9 / boardSize) - 4); // Target 40px
            } else { // 9x9
                cellSize = Math.min(32, Math.floor(screenWidth * 0.92 / boardSize) - 2); // Target 32px
            }
        }
        // If screenWidth >= 768, the PC default cellSize remains.
        
        cellSize = Math.floor(Math.max(20, cellSize)); // Ensure a minimum practical cell size (e.g., 20px)

        console.log(`Screen Width: ${screenWidth}, Board Size: ${boardSize}x${boardSize}, Difficulty: ${difficulty}, Calculated Cell Size: ${cellSize}px`);
        document.documentElement.style.setProperty('--sudoku-cell-size', `${cellSize}px`);
    }


    function renderBoard() {
        sudokuBoardEl.innerHTML = '';
        // Grid template columns/rows are now relative to --sudoku-cell-size, which is dynamic
        sudokuBoardEl.style.gridTemplateColumns = `repeat(${boardSize}, var(--sudoku-cell-size))`;
        sudokuBoardEl.style.gridTemplateRows = `repeat(${boardSize}, var(--sudoku-cell-size))`;


        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('sudoku-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (currentPuzzle[r][c] !== 0) {
                    cell.textContent = currentPuzzle[r][c];
                    cell.classList.add('fixed');
                } else {
                    if (userBoard[r][c] !== 0) {
                         cell.textContent = userBoard[r][c];
                    }
                    cell.addEventListener('click', () => handleCellClick(cell, r, c));
                }

                // Thick borders for subgrids
                if (boardSize === 6) { // Specific 2x3 subgrids for 6x6
                    if ((c + 1) % 3 === 0 && c < boardSize - 1) {
                        cell.classList.add('thick-border-right');
                    }
                    if ((r + 1) % 2 === 0 && r < boardSize - 1) {
                        cell.classList.add('thick-border-bottom');
                    }
                } else if (subgridSize > 0) { // For 4x4 and 9x9 using subgridSize
                    if ((c + 1) % subgridSize === 0 && c < boardSize - 1) {
                        cell.classList.add('thick-border-right');
                    }
                    if ((r + 1) % subgridSize === 0 && r < boardSize - 1) {
                        cell.classList.add('thick-border-bottom');
                    }
                }
                sudokuBoardEl.appendChild(cell);
            }
        }
    }

    function renderNumberSelector() {
        numberSelector.innerHTML = '';
        for (let i = 1; i <= boardSize; i++) {
            const btn = document.createElement('button');
            btn.classList.add('num-button');
            btn.textContent = i;
            btn.addEventListener('click', () => handleNumberClick(i));
            numberSelector.appendChild(btn);
        }
        // Num button sizes are handled by CSS using var(--sudoku-cell-size)
    }

    function handleCellClick(cellElement, row, col) {
        if (cellElement.classList.contains('fixed')) return;

        if (selectedCell) {
            selectedCell.element.classList.remove('selected');
        }
        selectedCell = { element: cellElement, row, col };
        cellElement.classList.add('selected');
        messageArea.textContent = `点击下方数字填入 (${row + 1}, ${col + 1})`;
    }

    function handleNumberClick(num) {
        if (!selectedCell || selectedCell.element.classList.contains('fixed')) {
            messageArea.textContent = '请先选择一个空格子！';
            return;
        }

        const { row, col } = selectedCell;
        selectedCell.element.textContent = num;
        userBoard[row][col] = num;

        selectedCell.element.classList.remove('error'); // Remove error class on new input
        messageArea.textContent = '填好了！';
        checkCompletion();
    }

    function startTimer() {
        stopTimer();
        secondsElapsed = 0;
        timeElapsedDisplay.textContent = formatTime(secondsElapsed);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timeElapsedDisplay.textContent = formatTime(secondsElapsed);
        }, 1000);
    }
    function stopTimer() { clearInterval(timerInterval); }
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function findEmpty(board) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === 0) {
                    return [r, c];
                }
            }
        }
        return null;
    }

    function isValid(board, num, row, col) {
        // Check row
        for (let c_ = 0; c_ < boardSize; c_++) {
            if (board[row][c_] === num && c_ !== col) return false;
        }
        // Check column
        for (let r_ = 0; r_ < boardSize; r_++) {
            if (board[r_][col] === num && r_ !== row) return false;
        }
        // Check subgrid
        let currentSubgridRows, currentSubgridCols;
        if (boardSize === 4) { currentSubgridRows = 2; currentSubgridCols = 2; } // 2x2 subgrids
        else if (boardSize === 6) { currentSubgridRows = 2; currentSubgridCols = 3; } // 2x3 subgrids
        else if (boardSize === 9) { currentSubgridRows = 3; currentSubgridCols = 3; } // 3x3 subgrids
        else { return true; } // Should not happen for valid boardSizes

        const startRow = row - (row % currentSubgridRows);
        const startCol = col - (col % currentSubgridCols);

        for (let r_ = 0; r_ < currentSubgridRows; r_++) {
            for (let c_ = 0; c_ < currentSubgridCols; c_++) {
                if (board[startRow + r_][startCol + c_] === num && (startRow + r_ !== row || startCol + c_ !== col)) {
                    return false;
                }
            }
        }
        return true;
    }

    function solveSudoku(board) {
        const findVal = findEmpty(board); 
        if (!findVal) return true;
        const [row, col] = findVal;

        let numbersToTry = Array.from({length: boardSize}, (_, i) => i + 1);
        // Shuffle numbers to try for varied puzzle generation
        for (let i = numbersToTry.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbersToTry[i], numbersToTry[j]] = [numbersToTry[j], numbersToTry[i]];
        }

        for (let num of numbersToTry) {
            if (isValid(board, num, row, col)) {
                board[row][col] = num;
                if (solveSudoku(board)) return true;
                board[row][col] = 0; // Backtrack
            }
        }
        return false;
    }

    let solutionCount; // Global for the recursive counter
    function countSolutions(board, limit = 2) {
        solutionCount = 0;
        _internalCountSolutions(board, limit);
        return solutionCount;
    }
    function _internalCountSolutions(board, limit) {
        if (solutionCount >= limit) return;
        const findVal = findEmpty(board);
        if (!findVal) {
            solutionCount++;
            return;
        }
        const [row, col] = findVal;
        for (let num = 1; num <= boardSize; num++) { // Try numbers in order for counting
            if (isValid(board, num, row, col)) {
                board[row][col] = num;
                _internalCountSolutions(board, limit);
                if (solutionCount >= limit) return; // Optimization
                board[row][col] = 0; // Backtrack
            }
        }
    }

    function generateSudokuPuzzle(size, difficulty) {
        console.log(`Generating ${size}x${size} puzzle, difficulty: ${difficulty}`);
        let puzzle = Array(size).fill(null).map(() => Array(size).fill(0));
        solveSudoku(puzzle); // Fill the board completely, this becomes the solution
        const solution = puzzle.map(row => [...row]);

        let cellsToRemove;
        const totalCells = size * size;

        // Define cells to remove based on difficulty and size
        if (size === 4) { // 16 cells
            cellsToRemove = (difficulty === 'easy') ? Math.floor(totalCells * 0.35) : Math.floor(totalCells * 0.45); // ~5-7 cells
        } else if (size === 6) { // 36 cells
            cellsToRemove = (difficulty === 'medium') ? Math.floor(totalCells * 0.48) : Math.floor(totalCells * 0.53); // ~17-19 cells
        } else { // 9x9, 81 cells
            if (difficulty === 'hard') { // 9x9 Simple
                cellsToRemove = Math.floor(totalCells * 0.50); // ~40-41 cells
            } else if (difficulty === 'expert') { // 9x9 Normal (Expert)
                cellsToRemove = Math.floor(totalCells * 0.62); // ~50 cells
            } else { 
                cellsToRemove = Math.floor(totalCells * 0.58); // Default for 9x9
            }
        }
        // Ensure a minimum number of clues remain
        const minClues = size > 4 ? size + 2 : size + 1;
        if (totalCells - cellsToRemove < minClues) {
            cellsToRemove = totalCells - minClues;
        }
        
        let removedCount = 0;
        let cellCoordinates = [];
        for(let r=0; r<size; r++) for(let c=0; c<size; c++) cellCoordinates.push([r,c]);
        // Shuffle coordinates to remove cells randomly
        for (let i = cellCoordinates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellCoordinates[i], cellCoordinates[j]] = [cellCoordinates[j], cellCoordinates[i]];
        }

        for (let i = 0; i < cellCoordinates.length && removedCount < cellsToRemove; i++) {
            const [r, c] = cellCoordinates[i];
            if (puzzle[r][c] === 0) continue; // Already removed or was part of multiple solutions path

            const temp = puzzle[r][c];
            puzzle[r][c] = 0; // Try removing
            
            const boardCopy = puzzle.map(row => [...row]);
            const numSolutions = countSolutions(boardCopy, 2); // Check for unique solution (limit 2 is enough)

            if (numSolutions !== 1) {
                puzzle[r][c] = temp; // Put it back if not unique
            } else {
                removedCount++;
            }
        }
        console.log(`Generated: ${size}x${size} puzzle. Clues: ${totalCells - removedCount}. Removed: ${removedCount}. Target removal: ${cellsToRemove}`);
        return { puzzle, solution };
    }

    function checkCompletion() {
        let allFilled = true;
        let allCorrect = true;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (userBoard[r][c] === 0) {
                    allFilled = false;
                    // No need to break, continue checking correctness for filled cells
                }
                if (userBoard[r][c] !== 0 && userBoard[r][c] !== currentSolution[r][c]) {
                    allCorrect = false;
                    // We can break here if we only care about *any* error,
                    // but for full check, let it run.
                }
            }
        }

        if (allFilled && allCorrect) {
            stopTimer();
            messageArea.textContent = "🎉 恭喜你，完成了！ 🎉";
            finalTimeDisplay.textContent = formatTime(secondsElapsed);
            
            // 新增：显示游戏统计数据
            const checksText = `检查次数: ${checksUsed}`;
            const hintsText = `提示次数: ${hintsUsed}`;
            gameStatsDisplay.innerHTML = `<p>${checksText}</p><p>${hintsText}</p>`;

            let stars = "⭐⭐⭐"; // Default 3 stars
            // Adjust stars based on time and difficulty
            if (boardSize === 9) {
                if (currentDifficulty === 'expert') {
                    if (secondsElapsed > 900) stars = "⭐⭐"; // > 15 mins
                    if (secondsElapsed > 1200) stars = "⭐";  // > 20 mins
                } else if (currentDifficulty === 'hard') { // 9x9 Simple
                    if (secondsElapsed > 600) stars = "⭐⭐"; // > 10 mins
                    if (secondsElapsed > 800) stars = "⭐";  // > 13.3 mins
                }
            } else if (boardSize === 6) { // Medium (6x6)
                 if (secondsElapsed > 90) stars = "⭐⭐";  // > 1.5 mins
                 if (secondsElapsed > 150) stars = "⭐"; // > 2.5 mins
            } else if (boardSize === 4) { // Easy (4x4)
                 if (secondsElapsed > 45) stars = "⭐⭐";  // > 45 secs
                 if (secondsElapsed > 75) stars = "⭐";   // > 1.25 mins
            }
            starsEarnedDisplay.textContent = stars;
            completionModal.classList.add('show');
            return true;
        }
        return false;
    }

    function clearBoardDisplay() {
        sudokuBoardEl.innerHTML = '';
        numberSelector.innerHTML = '';
        timeElapsedDisplay.textContent = '00:00';
    }
});
