
// Grid configuration
const ROWS = 20;
const COLS = 20;
let grid = [];
let startNode = { row: 10, col: 5 };
let endNode = { row: 10, col: 15 };
let isMouseDown = false;
let isDragging = false;
let draggedNode = null;
let selectedAlgorithm = 'astar';
let animationSpeed = 5;
let isVisualizing = false;
let isDarkMode = true; // Default to dark mode

// Initialize the grid
function initializeGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    grid = [];

    for (let row = 0; row < ROWS; row++) {
        const currentRow = [];
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Set start and end nodes
            if (row === startNode.row && col === startNode.col) {
                cell.classList.add('start');
                cell.innerHTML = '<i class="fas fa-play"></i>';
            } else if (row === endNode.row && col === endNode.col) {
                cell.classList.add('end');
                cell.innerHTML = '<i class="fas fa-flag-checkered"></i>';
            }

            // Add event listeners
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseenter', handleMouseEnter);
            cell.addEventListener('mouseup', handleMouseUp);

            gridElement.appendChild(cell);
            currentRow.push({
                row,
                col,
                isWall: false,
                isStart: row === startNode.row && col === startNode.col,
                isEnd: row === endNode.row && col === endNode.col,
                isVisited: false,
                isPath: false,
                previousNode: null,
                distance: Infinity,
                fScore: Infinity,
                gScore: Infinity
            });
        }
        grid.push(currentRow);
    }
}

// Event handlers for grid interaction
function handleMouseDown(event) {
    if (isVisualizing) return;
    isMouseDown = true;
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (grid[row][col].isStart) {
        isDragging = true;
        draggedNode = 'start';
    } else if (grid[row][col].isEnd) {
        isDragging = true;
        draggedNode = 'end';
    } else {
        toggleWall(row, col);
    }
}

function handleMouseEnter(event) {
    if (!isMouseDown || isVisualizing) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (isDragging) {
        if (draggedNode === 'start') {
            moveStartNode(row, col);
        } else if (draggedNode === 'end') {
            moveEndNode(row, col);
        }
    } else {
        toggleWall(row, col);
    }
}

function handleMouseUp() {
    isMouseDown = false;
    isDragging = false;
    draggedNode = null;
}

function toggleWall(row, col) {
    const node = grid[row][col];
    if (!node.isStart && !node.isEnd) {
        node.isWall = !node.isWall;
        updateGridUI();
    }
}

function moveStartNode(row, col) {
    const currentStart = grid[startNode.row][startNode.col];
    currentStart.isStart = false;
    
    const newStart = grid[row][col];
    if (!newStart.isEnd && !newStart.isWall) {
        newStart.isStart = true;
        startNode = { row, col };
        updateGridUI();
    } else {
        currentStart.isStart = true;
    }
}

function moveEndNode(row, col) {
    const currentEnd = grid[endNode.row][endNode.col];
    currentEnd.isEnd = false;
    
    const newEnd = grid[row][col];
    if (!newEnd.isStart && !newEnd.isWall) {
        newEnd.isEnd = true;
        endNode = { row, col };
        updateGridUI();
    } else {
        currentEnd.isEnd = true;
    }
}

function updateGridUI() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const node = grid[row][col];
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            
            // Reset classes and content
            cell.className = 'cell';
            cell.innerHTML = '';
            
            // Add appropriate classes and content
            if (node.isStart) {
                cell.classList.add('start');
                cell.innerHTML = '<i class="fas fa-play"></i>';
            }
            if (node.isEnd) {
                cell.classList.add('end');
                cell.innerHTML = '<i class="fas fa-flag-checkered"></i>';
            }
            if (node.isWall) cell.classList.add('wall');
            if (node.isVisited) cell.classList.add('visited');
            if (node.isPath) cell.classList.add('path');
        }
    }
}

// Algorithm implementations
async function visualizeAlgorithm() {
    if (isVisualizing) return;
    isVisualizing = true;
    
    // Reset grid state (keep walls)
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            grid[row][col].isVisited = false;
            grid[row][col].isPath = false;
            grid[row][col].previousNode = null;
            grid[row][col].distance = Infinity;
            grid[row][col].fScore = Infinity;
            grid[row][col].gScore = Infinity;
        }
    }
    
    updateGridUI();
    
    const startTime = performance.now();
    let pathFound = false;
    
    switch (selectedAlgorithm) {
        case 'astar':
            pathFound = await visualizeAStar();
            break;
        case 'dijkstra':
            pathFound = await visualizeDijkstra();
            break;
        case 'bfs':
            pathFound = await visualizeBFS();
            break;
    }
    
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    
    // Update stats
    document.getElementById('time-taken').textContent = `${Math.round(timeTaken)} ms`;
    document.getElementById('algorithm-name').textContent = 
        selectedAlgorithm === 'astar' ? 'A*' : 
        selectedAlgorithm === 'dijkstra' ? 'Dijkstra' : 'BFS';
    
    if (pathFound) {
        await visualizePath();
    } else {
        alert("No path found! Try removing some walls.");
    }
    
    isVisualizing = false;
}

// A* Algorithm
async function visualizeAStar() {
    return new Promise(resolve => {
        // Initialize open and closed sets
        const openSet = [];
        const closedSet = new Set();
        
        // Initialize start node
        const start = grid[startNode.row][startNode.col];
        start.gScore = 0;
        start.fScore = heuristic(start, grid[endNode.row][endNode.col]);
        openSet.push(start);
        
        function step() {
            if (openSet.length === 0) {
                resolve(false);
                return;
            }
            
            // Get node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fScore < current.fScore) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove current from openSet
            openSet.splice(currentIndex, 1);
            closedSet.add(`${current.row},${current.col}`);
            
            // If we reached the end
            if (current.row === endNode.row && current.col === endNode.col) {
                resolve(true);
                return;
            }
            
            // Mark as visited (if not start or end)
            if (!current.isStart && !current.isEnd) {
                current.isVisited = true;
                updateGridUI();
            }
            
            // Check neighbors
            const neighbors = getNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedSet.has(`${neighbor.row},${neighbor.col}`) || neighbor.isWall) {
                    continue;
                }
                
                const tentativeGScore = current.gScore + 1; // Assuming uniform cost
                
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= neighbor.gScore) {
                    continue;
                }
                
                // This path is better
                neighbor.previousNode = current;
                neighbor.gScore = tentativeGScore;
                neighbor.fScore = neighbor.gScore + heuristic(neighbor, grid[endNode.row][endNode.col]);
            }
            
            // Continue with next step after delay
            setTimeout(step, 150 / animationSpeed);
        }
        
        step();
    });
}

// Dijkstra's Algorithm
async function visualizeDijkstra() {
    return new Promise(resolve => {
        const unvisitedNodes = [];
        
        // Initialize all nodes
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const node = grid[row][col];
                node.distance = node.isStart ? 0 : Infinity;
                unvisitedNodes.push(node);
            }
        }
        
        function step() {
            if (unvisitedNodes.length === 0) {
                resolve(false);
                return;
            }
            
            // Sort nodes by distance
            unvisitedNodes.sort((a, b) => a.distance - b.distance);
            const closestNode = unvisitedNodes.shift();
            
            // If we're stuck at infinity, no path exists
            if (closestNode.distance === Infinity) {
                resolve(false);
                return;
            }
            
            // Mark as visited
            if (!closestNode.isStart && !closestNode.isEnd) {
                closestNode.isVisited = true;
                updateGridUI();
            }
            
            // If we reached the end
            if (closestNode.row === endNode.row && closestNode.col === endNode.col) {
                resolve(true);
                return;
            }
            
            // Update neighbors
            const neighbors = getNeighbors(closestNode);
            for (const neighbor of neighbors) {
                if (neighbor.isWall) continue;
                
                const newDistance = closestNode.distance + 1; // Assuming uniform cost
                if (newDistance < neighbor.distance) {
                    neighbor.distance = newDistance;
                    neighbor.previousNode = closestNode;
                }
            }
            
            // Continue with next step after delay
            setTimeout(step, 150 / animationSpeed);
        }
        
        step();
    });
}

// Breadth-First Search
async function visualizeBFS() {
    return new Promise(resolve => {
        const queue = [];
        const visited = new Set();
        
        // Start with the start node
        const start = grid[startNode.row][startNode.col];
        queue.push(start);
        visited.add(`${start.row},${start.col}`);
        
        function step() {
            if (queue.length === 0) {
                resolve(false);
                return;
            }
            
            const current = queue.shift();
            
            // If we reached the end
            if (current.row === endNode.row && current.col === endNode.col) {
                resolve(true);
                return;
            }
            
            // Mark as visited (if not start or end)
            if (!current.isStart && !current.isEnd) {
                current.isVisited = true;
                updateGridUI();
            }
            
            // Check neighbors
            const neighbors = getNeighbors(current);
            for (const neighbor of neighbors) {
                const key = `${neighbor.row},${neighbor.col}`;
                if (!visited.has(key) && !neighbor.isWall) {
                    visited.add(key);
                    neighbor.previousNode = current;
                    queue.push(neighbor);
                }
            }
            
            // Continue with next step after delay
            setTimeout(step, 150 / animationSpeed);
        }
        
        step();
    });
}

// Helper function to get valid neighbors
function getNeighbors(node) {
    const neighbors = [];
    const { row, col } = node;
    
    if (row > 0) neighbors.push(grid[row - 1][col]); // Up
    if (row < ROWS - 1) neighbors.push(grid[row + 1][col]); // Down
    if (col > 0) neighbors.push(grid[row][col - 1]); // Left
    if (col < COLS - 1) neighbors.push(grid[row][col + 1]); // Right
    
    return neighbors;
}

// Heuristic function for A* (Manhattan distance)
function heuristic(nodeA, nodeB) {
    return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

// Visualize the shortest path
async function visualizePath() {
    return new Promise(resolve => {
        // Reconstruct path from end to start
        const path = [];
        let currentNode = grid[endNode.row][endNode.col];
        
        while (currentNode !== null && !currentNode.isStart) {
            path.unshift(currentNode);
            currentNode = currentNode.previousNode;
        }
        
        // Update path length stat
        document.getElementById('path-length').textContent = path.length;
        
        // Update visited nodes stat
        let visitedCount = 0;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (grid[row][col].isVisited) visitedCount++;
            }
        }
        document.getElementById('visited-nodes').textContent = visitedCount;
        
        // Animate the path
        let i = 0;
        function animateStep() {
            if (i < path.length) {
                path[i].isPath = true;
                updateGridUI();
                i++;
                setTimeout(animateStep, 100 / animationSpeed);
            } else {
                resolve();
            }
        }
        
        animateStep();
    });
}

// Clear the current path
function clearPath() {
    if (isVisualizing) return;
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            grid[row][col].isVisited = false;
            grid[row][col].isPath = false;
            grid[row][col].previousNode = null;
            grid[row][col].distance = Infinity;
            grid[row][col].fScore = Infinity;
            grid[row][col].gScore = Infinity;
        }
    }
    
    updateGridUI();
    
    // Reset stats
    document.getElementById('path-length').textContent = '0';
    document.getElementById('visited-nodes').textContent = '0';
    document.getElementById('time-taken').textContent = '0 ms';
}

// Reset the entire grid
function resetGrid() {
    if (isVisualizing) return;
    
    startNode = { row: 10, col: 5 };
    endNode = { row: 10, col: 15 };
    initializeGrid();
    
    // Reset stats
    document.getElementById('path-length').textContent = '0';
    document.getElementById('visited-nodes').textContent = '0';
    document.getElementById('time-taken').textContent = '0 ms';
}

// Add random walls to the grid
function addWalls() {
    if (isVisualizing) return;
    
    // Clear existing walls first
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!grid[row][col].isStart && !grid[row][col].isEnd) {
                grid[row][col].isWall = false;
            }
        }
    }
    
    // Add random walls (about 20% of cells)
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!grid[row][col].isStart && !grid[row][col].isEnd && Math.random() < 0.2) {
                grid[row][col].isWall = true;
            }
        }
    }
    
    updateGridUI();
}

// Toggle between dark and light mode
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

// Set up event listeners for controls
function setupEventListeners() {
    // Algorithm buttons
    document.getElementById('astar-btn').addEventListener('click', () => {
        selectedAlgorithm = 'astar';
        updateAlgorithmButtons();
        updateAlgorithmInfo();
    });
    
    document.getElementById('dijkstra-btn').addEventListener('click', () => {
        selectedAlgorithm = 'dijkstra';
        updateAlgorithmButtons();
        updateAlgorithmInfo();
    });
    
    document.getElementById('bfs-btn').addEventListener('click', () => {
        selectedAlgorithm = 'bfs';
        updateAlgorithmButtons();
        updateAlgorithmInfo();
    });
    
    // Visualization controls
    document.getElementById('visualize-btn').addEventListener('click', visualizeAlgorithm);
    document.getElementById('clear-path-btn').addEventListener('click', clearPath);
    document.getElementById('reset-btn').addEventListener('click', resetGrid);
    
    // Speed control
    document.getElementById('speed-control').addEventListener('input', (e) => {
        animationSpeed = parseInt(e.target.value);
    });
    
    // Grid controls
    document.getElementById('add-walls-btn').addEventListener('click', addWalls);
    document.getElementById('clear-walls-btn').addEventListener('click', () => {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (!grid[row][col].isStart && !grid[row][col].isEnd) {
                    grid[row][col].isWall = false;
                }
            }
        }
        updateGridUI();
    });
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // FAQ accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.querySelector('.faq-question').addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
}

// Update active algorithm button
function updateAlgorithmButtons() {
    document.getElementById('astar-btn').classList.toggle('active', selectedAlgorithm === 'astar');
    document.getElementById('dijkstra-btn').classList.toggle('active', selectedAlgorithm === 'dijkstra');
    document.getElementById('bfs-btn').classList.toggle('active', selectedAlgorithm === 'bfs');
}

// Update algorithm information display
function updateAlgorithmInfo() {
    document.getElementById('astar-info').classList.toggle('active', selectedAlgorithm === 'astar');
    document.getElementById('dijkstra-info').classList.toggle('active', selectedAlgorithm === 'dijkstra');
    document.getElementById('bfs-info').classList.toggle('active', selectedAlgorithm === 'bfs');
}

// Initialize the application
function init() {
    initializeGrid();
    setupEventListeners();
    
    // Start in dark mode by default (already set)
    // Add some initial walls for demonstration
    addWalls();
}

// Start the application when the page loads
window.addEventListener('load', init);
