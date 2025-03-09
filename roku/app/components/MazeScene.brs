sub Init()
    deviceInfo = CreateObject("roDeviceInfo")
    screenSize = deviceInfo.GetDisplaySize()
    m.screenWidth = screenSize.w
    m.screenHeight = screenSize.h

    ' Dynamic sizing
    m.cellSize = m.screenWidth / 32 ' Scales maze to ~11-13 cells wide
    m.mazeWidth = Fix(m.screenWidth / m.cellSize)
    m.mazeHeight = Fix((m.screenHeight - m.screenHeight / 8) / m.cellSize) ' Reserve 1/8 for UI
    if m.mazeWidth mod 2 = 0 then m.mazeWidth = m.mazeWidth + 1
    if m.mazeHeight mod 2 = 0 then m.mazeHeight = m.mazeHeight + 1
    m.maze = GenerateMaze(m.mazeWidth, m.mazeHeight)
    m.tank = { pos: { x: 1, y: 1 }, targetPos: { x: 1, y: 1 }, dir: "right", currentAngle: 0 }
    m.chaosMonster = invalid
    m.bullets = []
    m.targets = []
    m.powerUps = []
    m.score = { hits: 0, lives: 5, total: 0, moves: 0 }
    m.currentTarget = 1
    m.marker = invalid
    m.gameOver = false
    m.levelCleared = false
    m.level = 1
    m.showNextTimer = 0
    m.numberTimer = 5000

    m.background = m.top.FindNode("background")
    m.mazeGroup = m.top.FindNode("mazeGroup")
    m.tankNode = m.top.FindNode("tank")
    m.chaosMonsterNode = m.top.FindNode("chaosMonster")
    m.bulletsGroup = m.top.FindNode("bulletsGroup")
    m.targetsGroup = m.top.FindNode("targetsGroup")
    m.powerUpsGroup = m.top.FindNode("powerUpsGroup")
    m.markerNode = m.top.FindNode("marker")
    m.scoreboard = m.top.FindNode("scoreboard")
    m.instructions = m.top.FindNode("instructions")
    m.message = m.top.FindNode("message")

    ' Set dynamic sizes and positions
    m.background.width = m.screenWidth
    m.background.height = m.screenHeight
    mazeOffsetX = (m.screenWidth - m.mazeWidth * m.cellSize) / 2
    mazeOffsetY = m.screenHeight / 8 ' Top 1/8 for scoreboard
    m.mazeGroup.translation = [mazeOffsetX, mazeOffsetY]
    m.tankNode.width = m.cellSize
    m.tankNode.height = m.cellSize
    m.chaosMonsterNode.width = m.cellSize
    m.chaosMonsterNode.height = m.cellSize
    m.scoreboard.translation = [mazeOffsetX, m.screenHeight / 16]
    m.instructions.translation = [mazeOffsetX, m.screenHeight - m.screenHeight / 16]
    m.message.translation = [m.screenWidth / 2, m.screenHeight / 2]

    LoadGameState()
    RenderMaze()
    InitLevel()
    UpdateTankPosition()
    UpdateScoreboard()

    m.instructionsTimer = CreateObject("roTimespan")
    m.instructionsTimer.Mark()

    m.timer = CreateObject("roSGNode", "Timer")
    m.timer.duration = 1 / 30
    m.timer.repeat = true
    m.timer.ObserveField("fire", "OnFrameEvent")
    m.timer.control = "start"

    m.top.SetFocus(true)
end sub

sub RenderMaze()
    m.mazeGroup.RemoveChildren()
    for y = 0 to m.mazeHeight - 1
        for x = 0 to m.mazeWidth - 1
            if m.maze[y][x] = 1
                wall = CreateObject("roSGNode", "Rectangle")
                wall.width = m.cellSize
                wall.height = m.cellSize
                wall.translation = [x * m.cellSize, y * m.cellSize]
                wall.color = "#808080"
                m.mazeGroup.AppendChild(wall)
            end if
        end for
    end for
end sub

sub InitLevel()
    m.tank.pos = GetRandomOpenPosition()
    m.tank.targetPos = m.tank.pos
    m.bullets = []
    m.bulletsGroup.RemoveChildren()
    m.targetsGroup.RemoveChildren()
    m.targets = []
    m.powerUpsGroup.RemoveChildren()
    m.powerUps = []
    m.currentTarget = 1
    m.marker = invalid
    m.markerNode.visible = false
    m.numberTimer = 5000

    targetCount = 3 + Fix((m.level - 1) / 3)
    for i = 1 to targetCount
        position = GetRandomOpenPosition()
        while m.targets.DoesExist(position.x.ToStr() + "," + position.y.ToStr()) or (position.x = m.tank.pos.x and position.y = m.tank.pos.y)
            position = GetRandomOpenPosition()
        end while
        target = CreateObject("roSGNode", "Rectangle")
        target.width = m.cellSize * 0.8
        target.height = m.cellSize * 0.8
        target.translation = [position.x * m.cellSize + m.cellSize * 0.1, position.y * m.cellSize + m.cellSize * 0.1]
        target.color = "#FF4500"
        label = CreateObject("roSGNode", "Label")
        label.font = "font:SmallSystemFont"
        label.text = i.ToStr()
        label.color = "#FFFFFF"
        label.translation = [position.x * m.cellSize + m.cellSize * 0.2, position.y * m.cellSize + m.cellSize * 0.2]
        m.targetsGroup.AppendChild(target)
        m.targetsGroup.AppendChild(label)
        m.targets.Push({ pos: position, num: i, hit: false, node: target, label: label, flashTimer: 0 })
    end for

    if m.level >= 4
        position = GetRandomOpenPosition()
        while m.targets.DoesExist(position.x.ToStr() + "," + position.y.ToStr()) or (position.x = m.tank.pos.x and position.y = m.tank.pos.y)
            position = GetRandomOpenPosition()
        end while
        m.chaosMonster = { pos: position, origin: position, speed: 4, holdingTarget: invalid, target: invalid }
        m.chaosMonsterNode.visible = true
        UpdateChaosMonsterPosition()
    end if

    if m.level >= 3
        powerUpCount = Min(Fix((m.level - 3) / 3), 5)
        for i = 1 to powerUpCount
            position = GetRandomOpenPosition()
            while m.targets.DoesExist(position.x.ToStr() + "," + position.y.ToStr()) or (position.x = m.tank.pos.x and position.y = m.tank.pos.y) or m.powerUps.DoesExist(position.x.ToStr() + "," + position.y.ToStr())
                position = GetRandomOpenPosition()
            end while
            powerUp = CreateObject("roSGNode", "Rectangle")
            powerUp.width = m.cellSize * 0.25
            powerUp.height = m.cellSize * 0.25
            powerUp.translation = [position.x * m.cellSize + m.cellSize * 0.375, position.y * m.cellSize + m.cellSize * 0.375]
            powerUp.color = "#FFFF00"
            m.powerUpsGroup.AppendChild(powerUp)
            m.powerUps.Push({ pos: position, node: powerUp })
        end for
    end if
end sub

sub UpdateTankPosition()
    m.tankNode.translation = [m.tank.pos.x * m.cellSize, m.tank.pos.y * m.cellSize]
end sub

sub UpdateChaosMonsterPosition()
    if m.chaosMonster <> invalid
        m.chaosMonsterNode.translation = [m.chaosMonster.pos.x * m.cellSize, m.chaosMonster.pos.y * m.cellSize]
    end if
end sub

sub UpdateScoreboard()
    m.scoreboard.text = "Score: " + m.score.total.ToStr() + "  Hits: " + m.score.hits.ToStr() + "  Moves: " + m.score.moves.ToStr() + "  Lives: " + m.score.lives.ToStr() + "  Level: " + m.level.ToStr()
end sub

function ToHex(value as integer) as string
    hexChars = "0123456789ABCDEF"
    if value < 0 then value = 0
    if value > 255 then value = 255
    high = Fix(value / 16)
    low = value mod 16
    return hexChars.Mid(high, 1) + hexChars.Mid(low, 1)
end function

' Helper: Shuffles an array in place
sub Shuffle(array as object)
    for i = array.Count() - 1 to 1 step -1
        j = Rnd(i + 1) - 1
        temp = array[i]
        array[i] = array[j]
        array[j] = temp
    end for
end sub

' Helper: Carves the maze recursively
sub Carve(x as integer, y as integer, maze as object, directions as object, width as integer, height as integer)
    maze[y][x] = 0
    dirs = directions.Copy() ' Create a copy to avoid modifying the original
    Shuffle(dirs)
    for each dir in dirs
        dx = dir[0]
        dy = dir[1]
        newX = x + dx
        newY = y + dy
        if newX > 0 and newX < width - 1 and newY > 0 and newY < height - 1 and maze[newY][newX] = 1
            maze[y + dy / 2][x + dx / 2] = 0
            Carve(newX, newY, maze, directions, width, height)
        end if
    end for
end sub

function GenerateMaze(width as integer, height as integer) as object
    maze = CreateObject("roArray", height, true)
    for y = 0 to height - 1
        maze[y] = CreateObject("roArray", width, true)
        for x = 0 to width - 1
            maze[y][x] = 1
        end for
    end for
    directions = [[2, 0], [-2, 0], [0, 2], [0, -2]]
    Carve(1, 1, maze, directions, width, height)
    for x = 0 to width - 1
        maze[height - 1][x] = 1
    end for
    return maze
end function

function GetRandomOpenPosition() as object
    attempts = 0
    maxAttempts = 13
    while attempts < maxAttempts
        x = Rnd(m.mazeWidth) - 1
        y = Rnd(m.mazeHeight) - 1
        if m.maze[y][x] = 0 then return { x: x, y: y }
        attempts = attempts + 1
    end while
    return { x: 1, y: 1 }
end function

function IsValidMove(pos as object) as boolean
    x = pos.x
    y = pos.y
    return x >= 0 and x < m.mazeWidth and y >= 0 and y < m.mazeHeight and m.maze[y][x] = 0
end function

function MoveFar(targetPos as object, dir as string) as object
    newPos = { x: targetPos.x, y: targetPos.y }
    dirVectors = { "up": { x: 0, y: -1 }, "down": { x: 0, y: 1 }, "left": { x: -1, y: 0 }, "right": { x: 1, y: 0 } }
    vec = dirVectors[dir]
    while IsValidMove({ x: newPos.x + vec.x, y: newPos.y + vec.y })
        newPos.x = newPos.x + vec.x
        newPos.y = newPos.y + vec.y
        if IsIntersection(newPos, OppositeDirection(dir)) then exit while
    end while
    return newPos
end function

function IsIntersection(pos as object, fromDir as string) as boolean
    directions = [
        { vec: { x: 0, y: -1 }, dir: "up" },
        { vec: { x: 0, y: 1 }, dir: "down" },
        { vec: { x: -1, y: 0 }, dir: "left" },
        { vec: { x: 1, y: 0 }, dir: "right" }
    ]
    openPaths = 0
    for each d in directions
        newPos = { x: pos.x + d.vec.x, y: pos.y + d.vec.y }
        if IsValidMove(newPos) and d.dir <> fromDir then openPaths = openPaths + 1
    end for
    return openPaths > 1
end function

function OppositeDirection(dir as string) as string
    opposites = { "up": "down", "down": "up", "left": "right", "right": "left" }
    return opposites[dir]
end function

function FindNearestTarget(pos as object) as object
    nearest = invalid
    minDistance = 9999
    for each t in m.targets
        if not t.hit
            dx = t.pos.x - pos.x
            dy = t.pos.y - pos.y
            distance = Sqr(dx * dx + dy * dy)
            if distance < minDistance
                minDistance = distance
                nearest = t
            end if
        end if
    end for
    return nearest
end function

function OnKeyEvent(key as string, press as boolean) as boolean
    if not press or m.gameOver or m.levelCleared then return false
    inputMap = {
        "up": { action: "moveFar", dir: "up" },
        "down": { action: "moveFar", dir: "down" },
        "left": { action: "moveFar", dir: "left" },
        "right": { action: "moveFar", dir: "right" },
        "rewind": { action: "moveOne", dir: "left" },
        "play": { action: "rotate" },
        "fastforward": { action: "moveOne", dir: "right" },
        "OK": { action: "shoot" },
        "back": { action: "reset" },
        "*": { action: "marker" },
        "options": { action: "peek" }
    }
    input = inputMap[key]
    if input <> invalid
        HandleInput(input)
        return true
    end if
    return false
end function

sub HandleInput(input as object)
    tank = m.tank
    dirVectors = { "up": { x: 0, y: -1 }, "down": { x: 0, y: 1 }, "left": { x: -1, y: 0 }, "right": { x: 1, y: 0 } }
    if input.action = "moveFar" and input.dir <> invalid
        tank.targetPos = MoveFar(tank.targetPos, input.dir)
        tank.pos = tank.targetPos
        tank.dir = input.dir
        m.score.moves = m.score.moves + 1
        UpdateTankPosition()
    else if input.action = "moveOne" and input.dir <> invalid
        if tank.dir <> input.dir
            tank.dir = input.dir
            UpdateTankPosition()
        else
            vec = dirVectors[input.dir]
            newPos = { x: tank.targetPos.x + vec.x, y: tank.targetPos.y + vec.y }
            if IsValidMove(newPos)
                tank.targetPos = newPos
                tank.pos = newPos
                m.score.moves = m.score.moves + 1
                UpdateTankPosition()
            end if
        end if
    else if input.action = "rotate"
        dirOrder = ["up", "right", "down", "left"]
        currentIdx = dirOrder.IndexOf(tank.dir)
        tank.dir = dirOrder[(currentIdx + 1) mod 4]
        UpdateTankPosition()
    else if input.action = "shoot"
        bullet = CreateObject("roSGNode", "Rectangle")
        bullet.width = 5
        bullet.height = 5
        bullet.color = "#FF0000"
        bullet.translation = [tank.pos.x * m.cellSize + m.cellSize / 2, tank.pos.y * m.cellSize + m.cellSize / 2]
        m.bulletsGroup.AppendChild(bullet)
        m.bullets.Push({ pos: { x: tank.pos.x, y: tank.pos.y }, dir: tank.dir, node: bullet, lifeDeducted: false })
    else if input.action = "marker"
        if m.marker = invalid
            m.marker = { x: tank.pos.x, y: tank.pos.y }
            m.markerNode.translation = [m.marker.x * m.cellSize + m.cellSize * 0.2, m.marker.y * m.cellSize + m.cellSize * 0.2]
            m.markerNode.visible = true
        else
            tank.targetPos = m.marker
            tank.pos = m.marker
            m.marker = invalid
            m.markerNode.visible = false
            UpdateTankPosition()
        end if
    else if input.action = "peek"
        if m.showNextTimer <= 0 and m.numberTimer <= 0
            m.showNextTimer = 3000 ' CONFIG.POWER_UP_REVEAL_DURATION
        end if
    else if input.action = "reset"
        ResetLevel(true)
    end if
    UpdateScoreboard()
end sub

sub ResetLevel(restartSameLevel as boolean)
    if m.gameOver and not restartSameLevel then return
    if m.levelCleared and not restartSameLevel
        m.score.lives = Min(m.score.lives + 1, 5)
        m.score.total = m.score.total + m.score.hits * m.score.lives + Max(0, 100 - m.score.moves * 2)
        m.level = m.level + 1
        m.mazeWidth = Min(7 + Fix(m.level / 3) * 2, 13)
        m.mazeHeight = m.mazeWidth
        if m.mazeWidth mod 2 = 0 then m.mazeWidth = m.mazeWidth + 1
        if m.mazeHeight mod 2 = 0 then m.mazeHeight = m.mazeHeight + 1
    end if
    m.maze = GenerateMaze(m.mazeWidth, m.mazeHeight)
    m.score.moves = 0
    m.gameOver = false
    m.levelCleared = false
    m.message.visible = false
    InitLevel()
    UpdateTankPosition()
    UpdateScoreboard()
    SaveGameState()
end sub

sub UpdateChaosMonster(deltaTime as float)
    if m.chaosMonster = invalid then return
    chaos = m.chaosMonster
    if chaos.holdingTarget <> invalid
        dx = chaos.origin.x - chaos.pos.x
        dy = chaos.origin.y - chaos.pos.y
        distance = Sqr(dx * dx + dy * dy)
        if distance > 0.1
            speed = chaos.speed
            moveDistance = Min(distance, speed * deltaTime)
            moveStepX = dx / distance * moveDistance
            moveStepY = dy / distance * moveDistance
            chaos.pos.x = chaos.pos.x + moveStepX
            chaos.pos.y = chaos.pos.y + moveStepY
        else
            chaos.holdingTarget.pos.x = chaos.origin.x
            chaos.holdingTarget.pos.y = chaos.origin.y
            chaos.pos.x = chaos.origin.x
            chaos.pos.y = chaos.origin.y
            if chaos.holdingTarget.hit
                chaos.holdingTarget = invalid
            end if
        end if
    else
        if chaos.target = invalid
            chaos.target = FindNearestTarget(chaos.pos)
            if chaos.target = invalid
                m.chaosMonster = invalid
                m.chaosMonsterNode.visible = false
                return
            end if
        end if
        dx = chaos.target.pos.x - chaos.pos.x
        dy = chaos.target.pos.y - chaos.pos.y
        distance = Sqr(dx * dx + dy * dy)
        if distance > 0.1
            speed = chaos.speed
            moveDistance = Min(distance, speed * deltaTime)
            moveStepX = dx / distance * moveDistance
            moveStepY = dy / distance * moveDistance
            chaos.pos.x = chaos.pos.x + moveStepX
            chaos.pos.y = chaos.pos.y + moveStepY
        else
            chaos.pos.x = chaos.target.pos.x
            chaos.pos.y = chaos.target.pos.y
            chaos.holdingTarget = chaos.target
            chaos.target = invalid
        end if
    end if
    UpdateChaosMonsterPosition()
end sub

sub Update(deltaTime as float)
    if m.levelCleared or m.gameOver then return

    ' Fade instructions
    if m.instructionsTimer.TotalSeconds() < 30
        alpha = 1 - (m.instructionsTimer.TotalSeconds() / 30)
        m.instructions.color = "#FF0000" + ToHex(Fix(alpha * 255))
    else
        m.instructions.visible = false
    end if

    ' Update timers
    if m.numberTimer > 0
        m.numberTimer = m.numberTimer - deltaTime * 1000
        if m.numberTimer < 0 then m.numberTimer = 0
    end if
    if m.showNextTimer > 0
        m.showNextTimer = m.showNextTimer - deltaTime * 1000
        if m.showNextTimer < 0 then m.showNextTimer = 0
    end if

    ' Update tank (simplified, no smooth movement)
    UpdateTankPosition()

    ' Update chaos monster
    UpdateChaosMonster(deltaTime)

    ' Update bullets
    for i = m.bullets.Count() - 1 to 0 step -1
        bullet = m.bullets[i]
        dirVectors = { "up": { x: 0, y: -0.4 }, "down": { x: 0, y: 0.4 }, "left": { x: -0.4, y: 0 }, "right": { x: 0.4, y: 0 } }
        vec = dirVectors[bullet.dir]
        bullet.pos.x = bullet.pos.x + vec.x
        bullet.pos.y = bullet.pos.y + vec.y
        bullet.node.translation = [bullet.pos.x * m.cellSize, bullet.pos.y * m.cellSize]
        gridX = Fix(bullet.pos.x)
        gridY = Fix(bullet.pos.y)
        if not IsValidMove({ x: gridX, y: gridY })
            if m.maze[gridY][gridX] = 1 and not bullet.lifeDeducted
                m.maze[gridY][gridX] = 0
                m.score.lives = m.score.lives - 1
                bullet.lifeDeducted = true
                RenderMaze()
            end if
            m.bulletsGroup.RemoveChild(bullet.node)
            m.bullets.Delete(i)
        else
            for j = m.targets.Count() - 1 to 0 step -1
                target = m.targets[j]
                if not target.hit and Abs(bullet.pos.x - target.pos.x) < 0.5 and Abs(bullet.pos.y - target.pos.y) < 0.5
                    if target.num = m.currentTarget
                        target.hit = true
                        target.node.visible = false
                        target.label.visible = false
                        m.score.hits = m.score.hits + 1
                        m.score.total = m.score.total + m.score.lives
                        m.currentTarget = m.currentTarget + 1
                    else
                        m.score.lives = m.score.lives - 1
                        target.flashTimer = 1000
                    end if
                    m.bulletsGroup.RemoveChild(bullet.node)
                    m.bullets.Delete(i)
                    UpdateScoreboard()
                    exit for
                end if
            end for
            if i >= 0 and i < m.bullets.Count()
                for j = m.powerUps.Count() - 1 to 0 step -1
                    powerUp = m.powerUps[j]
                    if Abs(bullet.pos.x - powerUp.pos.x) < 0.5 and Abs(bullet.pos.y - powerUp.pos.y) < 0.5
                        m.powerUpsGroup.RemoveChild(powerUp.node)
                        m.powerUps.Delete(j)
                        m.numberTimer = 5000
                        m.bulletsGroup.RemoveChild(bullet.node)
                        m.bullets.Delete(i)
                        exit for
                    end if
                end for
            end if
        end if
    end for

    ' Update targets (flash effect)
    for each target in m.targets
        if target.flashTimer > 0
            target.flashTimer = target.flashTimer - deltaTime * 1000
            alpha = Max(0, target.flashTimer / 1000)
            target.label.color = "#FFFFFF" + ToHex(Fix(alpha * 255))
            if target.flashTimer <= 0 then target.label.visible = false
        else if m.numberTimer > 0 or (m.showNextTimer > 0 and target.num = m.currentTarget)
            target.label.visible = true
        else if not target.hit
            target.label.visible = false
        end if
    end for

    ' Check game state
    if m.score.lives <= 0
        m.gameOver = true
        m.message.text = "Game Over"
        m.message.visible = true
        m.timer.control = "stop"
        delayTimer = CreateObject("roSGNode", "Timer")
        delayTimer.duration = 3
        delayTimer.ObserveField("fire", "OnGameOverDelay")
        delayTimer.control = "start"
    else
        allTargetsHit = true
        for each target in m.targets
            if not target.hit
                allTargetsHit = false
                exit for
            end if
        end for
        if allTargetsHit
            m.levelCleared = true
            m.message.text = "Level Cleared!"
            m.message.visible = true
            m.timer.control = "stop"
            delayTimer = CreateObject("roSGNode", "Timer")
            delayTimer.duration = 2
            delayTimer.ObserveField("fire", "OnLevelClearedDelay")
            delayTimer.control = "start"
        end if
    end if
end sub

sub OnGameOverDelay()
    m.score.lives = 5
    if m.level > 1 then m.level = m.level - 1
    ResetLevel(true)
    m.timer.control = "start"
end sub

sub OnLevelClearedDelay()
    ResetLevel(false)
    m.timer.control = "start"
end sub

sub OnFrameEvent()
    deltaTime = 1 / 30
    Update(deltaTime)
end sub

sub SaveGameState()
    reg = CreateObject("roRegistrySection", "MazeMemory")
    reg.Write("level", m.level.ToStr())
    reg.Write("total", m.score.total.ToStr())
    reg.Write("hits", m.score.hits.ToStr())
    reg.Flush()
end sub

sub LoadGameState()
    reg = CreateObject("roRegistrySection", "MazeMemory")
    level = reg.Read("level")
    total = reg.Read("total")
    hits = reg.Read("hits")
    if level <> invalid then m.level = level.ToInt()
    if total <> invalid then m.score.total = total.ToInt()
    if hits <> invalid then m.score.hits = hits.ToInt()
end sub

function Min(a as integer, b as integer) as integer
    if a < b then
        return a
    else
        return b
    end if
end function

function Max(a as integer, b as integer) as integer
    if a > b then
        return a
    else
        return b
    end if
end function