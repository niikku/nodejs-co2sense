let deviceToRemove = "";

function setDeviceToRemove(device) {
    deviceToRemove = device;
    $('#formDeviceID').val(device);
}

function deleteDevice() {
    alert(deviceToRemove);
}