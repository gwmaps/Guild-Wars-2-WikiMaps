/**
 * Additions in MediaWiki:Common.js
 */

jQuery(document).ready(function(){
	if($(".gw2map").length){
		$.each([
			"//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.css",
			"https://d1h9a8s8eodvjz.cloudfront.net/fonts/menomonia/08-02-12/menomonia.css",
			"https://d1h9a8s8eodvjz.cloudfront.net/fonts/menomonia/08-02-12/menomonia-italic.css"
		], function(){
			var ref = document.createElement("link");
			ref.setAttribute("rel", "stylesheet");
			ref.setAttribute("href", this);
			document.getElementsByTagName("head")[0].appendChild(ref);
		});
		$.ajax("//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.js", {cache:true, dataType:"script"}).done(function(){
			/*
			 * You'll need to change the link to the actual URL where the widget's JS is stored.
			 * For easy maintenance it's a good idea to store it somewhere in the Widget namespace.
			 * You can find the latest (minified) versions including polyline decorator and the PhpJS excerpts on the german GW2 wiki:
			 * //wiki-de.guildwars2.com/index.php?title=Widget:Karte/JS&action=raw&ctype=text/javascript
			 */
			$.ajax("../js/gw2wikimaps.min.js", {cache:true, dataType:"script"}).done(function(){
				$(".gw2map").each(function(){
					GW2Maps.init(this);
				});
			});
		});
	}
});