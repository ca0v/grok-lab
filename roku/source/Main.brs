sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)
    scene = screen.CreateScene("MazeScene")
    screen.Show()
    while true
        msg = wait(0, m.port)
    end while
end sub