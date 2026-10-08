-- Observe the real MUD command without intercepting or sending it.
local panel = mud.panel("beings-discworld-armour-helper")
local active, pending, lines, timer = false, "", {}, nil
local function publish(status)
    panel:post("coverage", {lines=lines, status=status})
end
local function finish()
    if not active then return end
    if pending ~= "" then lines[#lines+1] = pending; pending = "" end
    active = false
    publish(#lines > 0 and "complete" or "empty")
end
local function cancel_timer()
    if timer then timer:remove(); timer = nil end
end
mud.on_send("^\\s*coverage\\s*$", function()
    cancel_timer()
    active, pending, lines = true, "", {}
    publish("waiting")
    timer = mud.delay(5000, finish)
    -- No return value: the original command continues to the server.
end, {name="armour_coverage_sent"})
world.on("line", function(line)
    if not active then return end
    local text = (line.text or ""):gsub("\27%[[%d;]*m", ""):match("^%s*(.-)%s*$")
    if text:match("^Your ") then
        if pending ~= "" then lines[#lines+1] = pending end
        pending = text
    elseif pending ~= "" and text ~= "" and not pending:match("%.$") then
        pending = pending .. " " .. text
    elseif #lines > 0 or pending ~= "" then
        cancel_timer(); finish(); return
    end
    if pending:match("%.$") then
        lines[#lines+1] = pending; pending = ""
        publish("receiving")
    end
end)
panel:on_message("ready", function() publish(active and "waiting" or (#lines > 0 and "complete" or "idle")) end)
world.on("disconnect", function()
    cancel_timer(); active, pending, lines = false, "", {}; publish("idle")
end)
