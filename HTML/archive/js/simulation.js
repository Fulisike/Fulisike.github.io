class BallManager {
  constructor() {
    this.engine = Matter.Engine.create();
    // 添加重力设置
    this.engine.world.gravity.x = 0;
    this.engine.world.gravity.y = 0;
    this.canvas = document.getElementById('simCanvas');
    // 显式设置canvas尺寸
    const container = document.getElementById('container');
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    this.setupWalls();
    this.setupRenderer();
    this.running = false;
    this.balls = new Set();
    this.setupEventListeners();
  }

  setupWalls() {
    // 修改墙壁选项添加摩擦参数
    const wallOptions = { 
      isStatic: true, 
      render: { visible: false },
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0
    };
    this.walls = [
      Matter.Bodies.rectangle(0, this.canvas.height/2, 10, this.canvas.height, wallOptions),
      Matter.Bodies.rectangle(this.canvas.width, this.canvas.height/2, 10, this.canvas.height, wallOptions),
      Matter.Bodies.rectangle(this.canvas.width/2, 0, this.canvas.width, 10, wallOptions),
      Matter.Bodies.rectangle(this.canvas.width/2, this.canvas.height, this.canvas.width, 10, wallOptions)
    ];
    Matter.Composite.add(this.engine.world, this.walls);
  }

  setupRenderer() {
    this.render = Matter.Render.create({
      element: document.getElementById('container'),
      canvas: this.canvas, // 添加canvas引用
      engine: this.engine,
      options: {
        width: this.canvas.width,
        height: this.canvas.height,
        wireframes: false,
        background: 'transparent',
        // 新增上下文类型设置
        context: this.canvas.getContext('2d'),
        showAngleIndicator: true,
        showCollisions: true
      }
    });
    // 简化渲染更新逻辑
    Matter.Render.run(this.render);
  }

  setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loadBtn = document.getElementById('loadBtn');
    
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    
    startBtn.addEventListener('click', () => {
      this.running = true;
      this.balls.forEach(ball => {
        Matter.Body.setVelocity(ball, {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20
        });
      });
      Matter.Runner.run(this.engine);
    });

    stopBtn.addEventListener('click', () => {
      this.running = false;
      // 新增速度清零逻辑
      this.balls.forEach(ball => {
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(ball, 0);
      });
      Matter.Runner.stop(this.engine);
    // 移除会破坏物理世界结构的清除操作
    // Matter.Engine.clear(this.engine); 
    });

    clearBtn.addEventListener('click', () => this.handleClear());
    loadBtn.addEventListener('click', () => this.handleLoad());
  }

  handleCanvasClick(e) {
    if (!this.running) {
      const rect = this.canvas.getBoundingClientRect();
      // 修正坐标缩放计算（使用offsetWidth替代clientWidth）
      const scaleX = this.canvas.width / this.canvas.offsetWidth;
      const scaleY = this.canvas.height / this.canvas.offsetHeight;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      // 添加碰撞检测
      const hasCollision = [...this.balls].some(ball => {
        const dx = ball.position.x - x;
        const dy = ball.position.y - y;
        return Math.sqrt(dx*dx + dy*dy) < 60; // 两倍半径距离
      });
      
      if (!hasCollision) {
        this.createBall(x, y);
      }
    }
  }

  createBall(x, y) {
    const radius = 30;
    // 添加位置校验
    if (x < radius || x > this.canvas.width - radius || 
        y < radius || y > this.canvas.height - radius) {
      console.warn("无法在边缘区域生成小球");
      return;
    }
    const ball = Matter.Bodies.circle(x, y, radius, {
      restitution: 1,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      render: {
        fillStyle: `hsl(${Math.random()*360}, 70%, 50%)`,
        strokeStyle: '#333',
        lineWidth: 8,
        radius: radius,
        fill: true,  // 确保启用填充
        stroke: true // 确保启用描边
      }
    });

    console.log("hello.js");
    
    if (this.running) {
      Matter.Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8
      });
    }

    Matter.Composite.add(this.engine.world, ball);
    this.balls.add(ball);
  }

  async handleClear() {
    if (confirm('是否保存当前状态？')) {
      const data = JSON.stringify([...this.balls].map(ball => ({
        position: ball.position,
        velocity: ball.velocity,
        color: ball.render.fillStyle,
        // 新增物理参数保存
        restitution: ball.restitution,
        friction: ball.friction,
        frictionStatic: ball.frictionStatic,
        frictionAir: ball.frictionAir
      })));
      
      const blob = new Blob([data], {type: 'application/json'});
      
      try {
        // 新的文件保存流程
        const handle = await window.showSaveFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {'application/json': ['.json']}
          }],
          suggestedName: 'physics_state.json'
        });
        
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('保存失败:', err);
        }
      }
    }
    
    this.balls.forEach(ball => Matter.Composite.remove(this.engine.world, ball));
    this.balls.clear();
  }

  handleLoad() {
    if (this.balls.size > 0) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        data.forEach(state => {
          const ball = Matter.Bodies.circle(state.position.x, state.position.y, 30, {
            render: { fillStyle: state.color },
            velocity: state.velocity,
            // 恢复物理参数
            restitution: state.restitution,
            friction: state.friction,
            frictionStatic: state.frictionStatic, 
            frictionAir: state.frictionAir
          });
          Matter.Composite.add(this.engine.world, ball);
          this.balls.add(ball);
        });
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }
}

// 初始化系统
window.addEventListener('DOMContentLoaded', () => {
  new BallManager();
});