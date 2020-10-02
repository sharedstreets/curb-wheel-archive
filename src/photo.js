// not named Camera because cordova uses Camera in the global scope
class Photo {
    constructor() {
        this.options = {
            quality: 70,
            destinationType: Camera.DestinationType.FILE_URI,
            encodingType: Camera.EncodingType.JPEG,
            mediaType: Camera.MediaType.PICTURE,
            correctOrientation: true
        }

        this.openCamera = this.openCamera.bind(this);
    }

    async openCamera() {

        const imageUri = await getPicture(this.options);
        const fileEntry = await resolveLocalFileSystemURL(imageUri);
        const filename = `${uuidv4()}.jpg`
        var dirEntry;
        if(device.platform == "iOS")
          dirEntry = await resolveLocalFileSystemURL(cordova.file.dataDirectory);
        else
          dirEntry = await resolveLocalFileSystemURL(cordova.file.externalDataDirectory);
        const nativeURL = await moveFile(fileEntry, dirEntry, filename);
        console.log(nativeURL)
        return nativeURL
    }


}

let moveFile = function(f, dirEntry, filename) {
    return new Promise((resolve, reject) => {
        f.moveTo(dirEntry, filename, resolve, reject);
    })
}

let getPicture = function(options) {
    return new Promise((resolve, reject) => {
        navigator.camera.getPicture(resolve, reject, options)
    });
}

let resolveLocalFileSystemURL = function(entry) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(entry, resolve, reject)
    });
}


function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

export default Photo;
