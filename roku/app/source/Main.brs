sub Main()
    print "Starting Main"
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)
    scene = screen.CreateScene("MazeScene")
    print "Scene created"
    screen.Show()
    print "Screen shown"

    while true
        msg = Wait(0, m.port)
        if type(msg) = "roSGNodeEvent" then
            print "Event received: "; msg.GetField()
        end if
    end while
end sub