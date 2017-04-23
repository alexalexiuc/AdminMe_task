$(document).ready(function(){
	$('.deleteMovie').on('click', deleteMovie);
});


function deleteMovie(){
	var confirmation = confirm('Are you shure?');

	if(confirmation){
		$.ajax({
			type: "DELETE",
			url: "/delete/"+$(this).data('id')
		}).done(function(response){
			
		});
	} else {
		return false;
	}
	window.location.replace('/');
}
