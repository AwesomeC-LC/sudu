document.addEventListener('DOMContentLoaded', () => {
    const menuScreen = document.getElementById('menu-screen');
    const gameArea = document.getElementById('game-area');
    const tutorialArea = document.getElementById('tutorial-area');

    const sudokuBoardEl = document.getElementById('sudoku-board');
    const numberSelector = document.getElementById('number-selector');
    const messageArea = document.getElementById('message-area');
    const timeElapsedDisplay = document.getElementById('time-elapsed');

    const completionModal = document.getElementById('completion-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const starsEarnedDisplay = document.getElementById('stars-earned');

    // 获取需要操作的按钮
    const checkButton = document.getElementById('check-button'); // 重新获取检查按钮
    const hintButton = document.getElementById('hint-button');
    const eraseButton = document.getElementById('erase-button');
    const newGameButtonControls = document.getElementById('new-game-button');
    const backToMenuButton = document.getElementById('back-to-menu-button');
    const closeTutorialButton = document.getElementById('close-tutorial-button');
    const playAgainButton = document.getElementById('play-again-button');
    const modalBackToMenuButton = document.getElementById('modal-back-to-menu-button');


    let currentDifficulty = null;
    let boardSize = 9;
    let subgridSize = 3;

    let selectedCell = null;
    let timerInterval = null;
    let secondsElapsed = 0;

    let currentPuzzle = [];
    let currentSolution = [];
    let userBoard = [];

    // --- 事件监听器 ---
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const difficulty = e.target.dataset.difficulty;

            menuScreen.style.display = 'none';
            tutorialArea.style.display = 'none';
            gameArea.style.display = 'none';
            completionModal.classList.remove('show');

            if (action === 'tutorial') {
                showTutorial();
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

    backToMenuButton.addEventListener('click', goBackToMenu);

    // 游戏控制区按钮事件
    if (checkButton) {
        checkButton.addEventListener('click', () => {
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

            if (errorsFound > 0) {
                messageArea.textContent = `找到了 ${errorsFound} 个错误！已用红色标出。`;
            } else {
                // 如果没有错误，检查是否已完成
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
                         messageArea.textContent = '棋盘已填满，但似乎还有未发现的错误，请再检查一下或使用提示！';
                    } else {
                         messageArea.textContent = '太棒了，目前没有发现错误！继续加油！';
                    }
                }
            }
        });
    }

    if (hintButton) {
        hintButton.addEventListener('click', () => {
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
                            cellElement.textContent = correctValue;
                            userBoard[r][c] = correctValue;
                            cellElement.classList.remove('error');
                            cellElement.classList.add('hinted');
                            setTimeout(() => cellElement.classList.remove('hinted'), 1500);

                            messageArea.textContent = `提示：格子 (${r + 1}, ${c + 1}) 的数字是 ${correctValue}`;
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

    function goBackToMenu() {
        gameArea.style.display = 'none';
        tutorialArea.style.display = 'none';
        menuScreen.style.display = 'block';
        completionModal.classList.remove('show');
        stopTimer();
        clearBoardDisplay();
        selectedCell = null;
        messageArea.textContent = '';
    }

    function startGame(difficulty) {
        console.log(`正在开始游戏，难度: ${difficulty}`);
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
                subgridSize = 0;
                break;
            case 'hard': // 9x9 简单
            case 'expert': // 9x9 普通
            default:
                boardSize = 9;
                subgridSize = 3;
                break;
        }
        document.documentElement.style.setProperty('--board-size', boardSize);
        const cellSize = boardSize === 4 ? 70 : (boardSize === 6 ? 60 : 50);
        document.documentElement.style.setProperty('--sudoku-cell-size', `${cellSize}px`);
    }

    function renderBoard() {
        sudokuBoardEl.innerHTML = '';
        sudokuBoardEl.style.gridTemplateColumns = `repeat(${boardSize}, var(--sudoku-cell-size, 50px))`;
        sudokuBoardEl.style.gridTemplateRows = `repeat(${boardSize}, var(--sudoku-cell-size, 50px))`;

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

                if (boardSize === 6) {
                    if ((c + 1) % 3 === 0 && c < boardSize - 1) {
                        cell.classList.add('thick-border-right');
                    }
                    if ((r + 1) % 2 === 0 && r < boardSize - 1) {
                        cell.classList.add('thick-border-bottom');
                    }
                } else if (subgridSize > 0) {
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

        selectedCell.element.classList.remove('error');
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
        for (let c_ = 0; c_ < boardSize; c_++) {
            if (board[row][c_] === num && c_ !== col) return false;
        }
        for (let r_ = 0; r_ < boardSize; r_++) {
            if (board[r_][col] === num && r_ !== row) return false;
        }
        let currentSubgridRows, currentSubgridCols;
        if (boardSize === 4) { currentSubgridRows = 2; currentSubgridCols = 2; }
        else if (boardSize === 6) { currentSubgridRows = 2; currentSubgridCols = 3; }
        else if (boardSize === 9) { currentSubgridRows = 3; currentSubgridCols = 3; }
        else { return true; }

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
        const findVal = findEmpty(board); // 重命名避免与全局 find 冲突（如果存在）
        if (!findVal) return true;
        const [row, col] = findVal;

        let numbersToTry = Array.from({length: boardSize}, (_, i) => i + 1);
        for (let i = numbersToTry.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbersToTry[i], numbersToTry[j]] = [numbersToTry[j], numbersToTry[i]];
        }

        for (let num of numbersToTry) {
            if (isValid(board, num, row, col)) {
                board[row][col] = num;
                if (solveSudoku(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    let solutionCount;
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
        for (let num = 1; num <= boardSize; num++) {
            if (isValid(board, num, row, col)) {
                board[row][col] = num;
                _internalCountSolutions(board, limit);
                if (solutionCount >= limit) return;
                board[row][col] = 0;
            }
        }
    }

    function generateSudokuPuzzle(size, difficulty) {
        console.log(`生成 ${size}x${size} 谜题，难度: ${difficulty}`);
        let puzzle = Array(size).fill(null).map(() => Array(size).fill(0));
        solveSudoku(puzzle);
        const solution = puzzle.map(row => [...row]);

        let cellsToRemove;
        const totalCells = size * size;

        if (size === 4) { // 16 格
            cellsToRemove = (difficulty === 'easy') ? Math.floor(totalCells * 0.35) : Math.floor(totalCells * 0.45); // 约 5-7 格
        } else if (size === 6) { // 36 格
            cellsToRemove = (difficulty === 'medium') ? Math.floor(totalCells * 0.48) : Math.floor(totalCells * 0.53); // 约 17-19 格
        } else { // 9x9, 81 格
            if (difficulty === 'hard') { // 9x9 简单模式
                cellsToRemove = Math.floor(totalCells * 0.50); // 移除约 50% (40-41格)，留下更多数字
            } else if (difficulty === 'expert') { // 9x9 普通(专家)模式
                cellsToRemove = Math.floor(totalCells * 0.62); // 移除约 62% (50格)
            } else { // 默认 (如果添加了其他9x9难度)
                cellsToRemove = Math.floor(totalCells * 0.58);
            }
        }
        // 确保至少有一些预填数字
        if (totalCells - cellsToRemove < size + 1 && size > 4) cellsToRemove = totalCells - (size + 2); // 至少留 size+2 个
        else if (totalCells - cellsToRemove < size && size <=4) cellsToRemove = totalCells - (size + 1); // 至少留 size+1 个


        let removedCount = 0;
        let cellCoordinates = [];
        for(let r=0; r<size; r++) for(let c=0; c<size; c++) cellCoordinates.push([r,c]);
        for (let i = cellCoordinates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellCoordinates[i], cellCoordinates[j]] = [cellCoordinates[j], cellCoordinates[i]];
        }

        for (let i = 0; i < cellCoordinates.length && removedCount < cellsToRemove; i++) {
            const [r, c] = cellCoordinates[i];
            if (puzzle[r][c] === 0) continue;
            const temp = puzzle[r][c];
            puzzle[r][c] = 0;
            const boardCopy = puzzle.map(row => [...row]);
            const numSolutions = countSolutions(boardCopy, 2); // 检查唯一解 (limit=2 表示找到2个就停)
            if (numSolutions !== 1) {
                puzzle[r][c] = temp;
            } else {
                removedCount++;
            }
        }
        console.log(`生成完毕: ${size}x${size} 谜题，预填 ${totalCells - removedCount} 格。移除了 ${removedCount} 格。`);
        return { puzzle, solution };
    }

    function checkCompletion() {
        let allFilled = true;
        let allCorrect = true;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (userBoard[r][c] === 0) {
                    allFilled = false;
                }
                if (userBoard[r][c] !== 0 && userBoard[r][c] !== currentSolution[r][c]) {
                    allCorrect = false;
                }
            }
        }

        if (allFilled && allCorrect) {
            stopTimer();
            messageArea.textContent = "🎉 恭喜你，完成了！ 🎉";
            finalTimeDisplay.textContent = formatTime(secondsElapsed);
            let stars = "⭐⭐⭐";
            if (boardSize === 9) {
                if (secondsElapsed > 900 && currentDifficulty === 'expert') stars = "⭐⭐";
                else if (secondsElapsed > 1200 && currentDifficulty === 'expert') stars = "⭐";
                else if (secondsElapsed > 600 && currentDifficulty === 'hard') stars = "⭐⭐"; // 简单模式时间可以宽松点
                else if (secondsElapsed > 800 && currentDifficulty === 'hard') stars = "⭐";
            } else if (boardSize === 6) {
                 if (secondsElapsed > 90) stars = "⭐⭐";
                 if (secondsElapsed > 150) stars = "⭐";
            } else if (boardSize === 4) {
                 if (secondsElapsed > 45) stars = "⭐⭐";
                 if (secondsElapsed > 75) stars = "⭐";
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