/* File Manager -- START */
var HomePath = null;
var PathList = [];
var IndexOfCurrentPaths = null;
var player = dashjs.MediaPlayer().create();
var clickedFileID = null;
var clickedRelativePath = null;
var statusIntervalPromise = null;

// Initialization
(function(){
	if(sessionStorage.getItem("kenesis") === null)
	{
		location.replace('/');
	}

	$.ajax({
        url:'/api/v1/user',
        dataType:'json',
		headers : {Authorization : "Bearer " + sessionStorage.getItem("kenesis")},
        success:function(reponse){
        	HomePath = reponse.homelocation;
        }
    });

	player.initialize(document.querySelector("#videoPlayer"), '', false);
    console.log("Dash.js Player " + player.getVersion() + " initialized");
})();

$(function () {
    var relativePath = '/';
    viewDirectory(relativePath);
    PathList.push(relativePath);
    IndexOfCurrentPaths = 0;
});

function viewDirectory(relativePath)
{
    showLoadingIndicator($("#file-explorer")[0]);

    $.ajax({
        url: '/api/v1/files?location=' + relativePath,
        dataType:'json',
        headers : {Authorization : "Bearer " + sessionStorage.getItem("kenesis")},
        success:function(folderData){
            hideLoadingIndicator($("#file-explorer")[0]);

	        for (var key in folderData) {
	        	var absPath = folderData[key].path;
	        	var splitedStr = absPath.split('/');
	        	var filename = splitedStr[splitedStr.length-1];

	        	if(filename[0] !== '.')
	        	{
	            	var div = document.createElement('div');
	            	div.setAttribute('class', 'col-xs-3 col-sm-3 col-md-1 pb-filemng-body-folders');
	            	
	            	var img = document.createElement('img');
	            	img.setAttribute('class', 'img-responsive');
	            	img.setAttribute('id', folderData[key].fileid);
	            	img.setAttribute('absolutepath', absPath);
	            	img.setAttribute('type', folderData[key].type);

	            	//Decide File Icon
	            	if (folderData[key].type === "mp4")
					{
                        img.setAttribute('src', '/htdocs/images/filemanager/mp4-icon.jpg');
					}
					else if (folderData[key].type === "mkv")
					{
                        img.setAttribute('src', '/htdocs/images/filemanager/mkv-icon.jpg');
					}
                    else if (folderData[key].type === "avi")
                    {
                        img.setAttribute('src', '/htdocs/images/filemanager/avi-icon.jpg');
                    }
                    else if (folderData[key].type === "Directory")
                    {
                        img.setAttribute('src', '/htdocs/images/filemanager/folder-icon.png');
                    }
                    else
					{
                        img.setAttribute('src', '/htdocs/images/filemanager/file-icon.png');
					}

	            	var br = document.createElement('br');

	            	var p = document.createElement('p');
	            	p.setAttribute('class', 'pb-filemng-paragraphs');
	            	p.setAttribute('style', 'word-break:break-word;');

	            	if(filename.length >= 25) {
						p.innerText = filename.substr(0, 25) + "...";
					} else {
                        p.innerText = filename;
					}

	            	div.appendChild(img);
	            	div.appendChild(br);
	            	div.appendChild(p);

	            	$(".pb-filemng-template-body").append(div);
	        	}
	        }
        }
    })
}

function preViewDirectory()
{
	if(PathList.length > 1 && IndexOfCurrentPaths > 0)
	{
		$(".pb-filemng-template-body").empty();

		viewDirectory(PathList[--IndexOfCurrentPaths]);
	}
}

function nextViewDirectory()
{
	if(PathList.length > 1 && PathList.length > (IndexOfCurrentPaths+1))
	{
		$(".pb-filemng-template-body").empty();
		viewDirectory(PathList[++IndexOfCurrentPaths]);
	}
}

function cancelEncode(fileid)
{
	$.ajax({
        url: '/api/v1/transcode/' + clickedFileID,
        method : 'DELETE',
        headers : {Authorization : "Bearer " + sessionStorage.getItem("kenesis")}
    })
}

function requestEncode(relativePath, successCallback)
{
	$.ajax({
        url: '/api/v1/transcode?location=' + relativePath,
        method : 'POST',
        headers : {Authorization : "Bearer " + sessionStorage.getItem("kenesis")},
        success : successCallback
    })
}

function getStatusOfTranscode(fileid, successCallback)
{
    $.ajax({
        url: '/api/v1/transcode/' + fileid,
        dataType:'json',
        method : 'GET',
        headers: {
			'Cache-Control' : 'no-cache',
			Authorization : "Bearer " + sessionStorage.getItem("kenesis")
		},
        success: successCallback
    })
}

function StartMonitoringStatusOfTrancode()
{
	statusIntervalPromise = setInterval(function(){
			getStatusOfTranscode(clickedFileID, 
				function(response){
					$('#EncodeModal .modal-title')[0].innerText = 'Transcoding...';

					$('#EncodeModal .modal-body').empty();

					var Element = document.createElement('p');
					Element.innerText = response.status + " : " + response.progress + "%";

					$('#EncodeModal .modal-body').append(Element);
				
					if(response.progress === 100 && response.status === "Complete")
					{
						StopMonitoringStatusOftrancode();
						$('#EncodeModal').modal('hide');
					}
				});
		}, 1000);
}

function StopMonitoringStatusOftrancode()
{
	clearInterval(statusIntervalPromise);
}

function ChangePlayerURL(url)
{
	player.attachView(document.querySelector("#videoPlayer"));
	player.attachSource(url);
	player.setAutoPlay(false);
}

function resetEncodeModalInnerText()
{
	$('#EncodeModal .modal-title')[0].innerText = 'Request Transcoding';

	$('#EncodeModal .modal-body').empty();
	var Element = document.createElement('p');
	Element.innerText = 'Do you want to transcode this media?';

	$('#EncodeModal .modal-body').append(Element);
}

function showLoadingIndicator(parentElement)
{
    var spinner = new Spinner().spin();
    parentElement.appendChild(spinner.el);
}

function hideLoadingIndicator(parentElement)
{
	if($(".spinner") === null) return;

	parentElement.removeChild($(".spinner")[0]);
}

//EncodeModal is shwoing
$('#EncodeModal').on('show.bs.modal', function (e) {

});

$('#EncodeModal').on('hide.bs.modal', function (e) {
	clearInterval(statusIntervalPromise);
    $('#EncodeModal .modal-body').empty();
});

$('#PlayerModal').on('hide.bs.modal', function (e) {
	player.reset();
});

$('#EncodeModal .modal-footer').on("click" , function(event){
	if(event.target.className === "btn btn-primary")
	{
		requestEncode(clickedRelativePath, function(response){
			clickedFileID = response;
			StartMonitoringStatusOfTrancode();
		});
	}
	else if(event.target.className === "btn btn-danger")
	{
		cancelEncode(clickedFileID);
		$('#EncodeModal').modal('hide');
	}
});

$('#PlayerModal .modal-footer').on("click" , function(event){
	if(event.target.className === "btn btn-danger")
	{
		cancelEncode(clickedFileID);
		$('#PlayerModal').modal('hide');
	}
});

$(".pb-filemng-template-body").on("click",'img',function(event){
	var relativePath = event.target.attributes.absolutepath.value.split(HomePath + '/')[1];
	clickedRelativePath = relativePath;
	var type = event.target.attributes.type.value;

	switch (type)
	{
		case 'mp4':
		case 'mkv':
		case 'avi':
            showLoadingIndicator($("#PlayerModal .modal-content")[0]);

            $.ajax({
                url: '/api/v1/files?location=' + relativePath,
                dataType:'json',
                method : 'GET',
                headers : {Authorization : "Bearer " + sessionStorage.getItem("kenesis")},
                success:function(filinfo){
                    clickedFileID = filinfo[0].fileid;

                    if(clickedFileID === String(-1))
                    {
                        resetEncodeModalInnerText();
                        $('#EncodeModal').modal('show');
                    }
                    else
                    {
                        getStatusOfTranscode(clickedFileID, function(response){
                            // hideLoadingIndicator($("#PlayerModal .modal-content")[0]);
                            if(response.progress === 100 && response.status == "Complete")
                            {
                            	hideLoadingIndicator($("#PlayerModal .modal-content")[0]);
                                $('#PlayerModal').modal('show');
                                var url = '../../media/' + clickedFileID + '/segmented/media.mpd';
                                ChangePlayerURL(url);
                            }
                            else
                            {
                                showLoadingIndicator($("#EncodeModal .modal-content")[0]);
                                StartMonitoringStatusOfTrancode();
                                $('#EncodeModal').modal('show');
                            }
                        });
                    }
                }
            });
			break;
		case 'Directory':
            $(".pb-filemng-template-body").empty();

            PathList = PathList.splice(0, IndexOfCurrentPaths + 1);
            PathList.push(relativePath);
            IndexOfCurrentPaths++;
            viewDirectory(relativePath);
			break;
		default:
			break;
	}
});
/* File Manager -- END */