// 绳子物理模拟
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 设置画布大小为窗口大小
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 物理参数
const GRAVITY = 0.5;
const STIFFNESS = 0.8; // 弹性系数
const DAMPING = 0.95; // 阻尼系数
const SEGMENT_LENGTH = 2; // 每段绳子长度
const NODE_COUNT = 60; // 节点数量
const ROPE_COLOR = '#ADD8E6'; // 淡蓝色

// 节点类
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
        this.pinned = false;
    }

    // 更新位置
    update() {
        if (this.pinned) return;
        
        const vx = (this.x - this.oldX) * DAMPING;
        const vy = (this.y - this.oldY) * DAMPING;
        
        this.oldX = this.x;
        this.oldY = this.y;
        
        this.x += vx;
        this.y += vy + GRAVITY;
    }

    // 约束节点间距离
    constrain(node) {
        const dx = node.x - this.x;
        const dy = node.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const diff = (SEGMENT_LENGTH - distance) / distance * STIFFNESS;
        if (distance < SEGMENT_LENGTH) return;
        
        // 如果节点被选中，则完全跟随鼠标位置
        if (this === selectedNode || node === selectedNode) {
            // 不再跳过约束计算
        }
        
        if (!this.pinned) {
            this.x -= dx * diff * 0.5;
            this.y -= dy * diff * 0.5;
        }
        
        if (!node.pinned) {
            node.x += dx * diff * 0.5;
            node.y += dy * diff * 0.5;
        }
    }
}

// 创建绳子节点
const nodes = [];
const startX = canvas.width / 2;
const startY = 50;

for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push(new Node(startX, startY + i * SEGMENT_LENGTH * 0.75));
}

// 固定第一个节点（天花板）
nodes[0].pinned = true;

// 鼠标交互
let selectedNode = null;

canvas.addEventListener('mousedown', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // 查找最近的节点
    let minDist = Infinity;
    nodes.forEach(node => {
        if (node.pinned) return;
        
        const dist = Math.sqrt(
            Math.pow(node.x - mouseX, 2) + 
            Math.pow(node.y - mouseY, 2)
        );
        
        if (dist < minDist && dist < 30) {
            minDist = dist;
            selectedNode = node;
            // 重置旧位置以消除惯性
            selectedNode.oldX = mouseX;
            selectedNode.oldY = mouseY;
        }
    });
    
    if (selectedNode) {
        selectedNode.x = mouseX;
        selectedNode.y = mouseY;
        selectedNode.pinned = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (selectedNode) {
        selectedNode.x = e.clientX;
        selectedNode.y = e.clientY;
    }
});

canvas.addEventListener('mouseup', () => {
    selectedNode.pinned = false;
    selectedNode.oldX = selectedNode.x;
    selectedNode.oldY = selectedNode.y;
    selectedNode = null;
});

// 动画循环
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新物理
    for (let i = 0; i < nodes.length; i++) {
        nodes[i].update();
    }
    
    // 约束
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < nodes.length - 1; j++) {
            nodes[j].constrain(nodes[j + 1]);
        }
    }
    
    // 绘制天花板
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, 10);
    
    // 绘制绳子
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    
    for (let i = 1; i < nodes.length; i++) {
        ctx.lineTo(nodes[i].x, nodes[i].y);
    }
    
    ctx.strokeStyle = ROPE_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 绘制节点
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = node.pinned ? '#333' : ROPE_COLOR;
        ctx.fill();
    });
    
    requestAnimationFrame(animate);
}

// 开始动画
animate();

// 窗口大小调整
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 重置固定节点位置
    nodes[0].x = canvas.width / 2;
    nodes[0].y = 50;
});