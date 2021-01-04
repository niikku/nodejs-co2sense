$(function(){
    var current = location.pathname;

    $('nav li a').each(function(){
        var $this = $(this);
        
        // if the current path is like this link, make it active
        if($this.attr('href') === current){
            $this.addClass('active');
        }
    })
})