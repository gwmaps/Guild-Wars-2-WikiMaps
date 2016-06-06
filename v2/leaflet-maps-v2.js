/**
 * Created by Smiley on 04.06.2016.
 */

'use strict';

class GW2Map {

	/**
	 * @param container
	 * @param id
	 * @returns {GW2Map}
	 */
	constructor(container, id){
		this.container = container;
		this.id = id;

		this.apiBase = 'https://api.guildwars2.com/v2';
		this.minZoom = 0;
		this.maxZoom = 7;
		this.viewRect = [[0, 0], [32768, 32768]];

		// todo: settings
		this.mapAttribution = ' &copy; <a href="http://www.arena.net/" target="_blank">ArenaNet</a> - <a href="http://wiki.guildwars2.com/wiki/API:Main" target="_blank">GW2 Maps API</a>';
		this.mapRectColor    = 'rgba(255, 255, 255, 0.3)';
		this.regionRectColor = 'rgba(255, 200, 20, 0.3)';
		this.zonePolyColor   = 'rgba(250, 250, 30, 0.8)';

		this.layers = {};
		this.objectives = {};

		this.getOptions().setBaseMap();

		if(this.options.map_controls){
			this.addMapControls();
		}

		// todo automagically display/remove icons
		this.map.on('zoomend', () => this.toggleLayers());

		// draw the maps
		fetch(this.options.mapUrl, {mode: 'cors'})
			.then(r =>{
				if(r.status === 200){
					return r;
				}

				throw new Error(r.statusText);
			})
			.then(r => r.json())
			.then(r =>{

				// a response to floors
				if(r.regions){
					Object.keys(r.regions).forEach(regionID => this.drawRegion(r.regions[regionID], regionID));
				}
				// a regions response
				else if(r.maps){
					this.drawRegion(r, this.options.region_id);
				}
				// an actual map response
				else if(r.points_of_interest){
					this.drawMap(r);
				}
				else{
					return;
				}

				this.setView(r);
			})
			// do stuff
			.then(()=>{
				// wvw objectives
				if(this.options.continent_id === 2 && this.options.floor_id > 0 && this.options.floor_id < 4){

					// listen to objective changes
					Object.observe(this.objectives, changes => changes.forEach(c => this.drawObjectives(c)));

					fetch(this.apiBase + '/wvw/objectives?ids=all&lang=' + this.options.lang)
						.then(r => r.json())
						.then(r => r.forEach(objective => this.objectives[objective.id] = objective));
				}

				// markers, lines, ...

			})
			.catch(error => console.log('(╯°□°）╯彡┻━┻ ', error));

		return this;
	}

	/**
	 * @param region
	 * @param regionID
	 * @returns {GW2Map}
	 */
	drawRegion(region, regionID){ // todo: API - no regionID in response/metadata

		var marker = L.marker(this.p2ll(region.label_coord), {
			title: region.name,
			icon : L.divIcon({
				iconSize : [300, 30],
				className: 'region-label',
				html     : region.name
			})
		});

		var popup = '<a href="' + this.i18n.wiki + encodeURIComponent(region.name) + '" target="_blank">' + region.name + '</a><br />id:' + regionID;

		// todo: layername workaround
		var layername = '<span class="layer-control" id="map' + this.id+ '-region"></span>';

		marker.bindPopup(popup);
		this.layers[layername].addLayer(marker);

		var bounds = this.rect2bounds(region.continent_rect);

		var regionRect = L.rectangle(bounds, {
			clickable: false,
			color : this.regionRectColor,
			weight: 0.3
		});

		this.layers[layername].addLayer(regionRect);

		// loop through the maps
		Object.keys(region.maps).forEach(mapID => this.drawMap(region.maps[mapID]));

		return this;
	}

	/**
	 * @param map
	 * @returns {GW2Map}
	 */
	drawMap(map){
		var level = map.min_level === map.max_level
			? map.max_level
			: map.min_level+'-'+map.max_level;

		var bounds = this.rect2bounds(map.continent_rect);

		var lvl = intval(level) > 0 ? ' ('+level+')' :  '';

		var mapLabel = L.marker(bounds.getCenter(), {
			title: map.name + lvl,
			icon: L.divIcon({
				iconSize: [300, 30],
				className: 'map-label',
				html: map.name + lvl,
			})
		});

		var popup = '<a href="' + this.i18n.wiki + encodeURIComponent(map.name) + '" target="_blank">' + map.name + '</a> ' + lvl + ', ID: ' + map.id;

		// todo: layername workaround
		var layername = '<span class="layer-control" id="map' + this.id+ '-map"></span>';

		mapLabel.bindPopup(popup);
		this.layers[layername].addLayer(mapLabel);

		var mapRect = L.rectangle(bounds, {
			clickable: false,
			color : this.mapRectColor,
			weight: 0.3
		});

		this.layers[layername].addLayer(mapRect);

		this.drawSectors(map.sectors)
			.drawSkillChallenges(map.skill_challenges)
			.drawTasks(map.tasks)
			.drawPOI(map.points_of_interest);

		return this;
	}

	/**
	 * @param sectors
	 * @returns {GW2Map}
	 */
	drawSectors(sectors){

		Object.keys(sectors).forEach(sectorId =>{
			var s = sectors[sectorId];

			// todo: layername workaround
			var layername = '<span class="layer-control" id="map' + this.id + '-sector"></span>';

			if(s.bounds){
				var sectorPoly = L.polygon(s.bounds.map(coords => this.p2ll(coords)), {
					clickable: false,
					color: this.zonePolyColor,
					weight: 1.0
				});

				this.layers[layername].addLayer(sectorPoly);
			}

			if(s.name && s.coord){
				var lvl = intval(s.level) > 0 ? ' ('+s.level+')' : '';
				var sectorLabel = L.marker(this.p2ll(s.coord), {
					title: s.name + lvl,
					icon: L.divIcon({
						iconSize : [200, 20],
						className: 'sector-label',
						html     : s.name + lvl
					})
				});

				var popup ='<a href="' + this.i18n.wiki+encodeURIComponent(s.name) + '" target="_blank">' + s.name + '</a>' + lvl +
				           '<br><input class="chatlink" type="text" value="' + s.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';

				sectorLabel.bindPopup(popup);
				this.layers[layername].addLayer(sectorLabel);
			}

		});

		return this;
	}

	/**
	 * @param skill_challenges
	 * @returns {GW2Map}
	 */
	drawSkillChallenges(skill_challenges){

		if(!skill_challenges.length){
			return this;
		}

		skill_challenges.forEach(c =>{
			var marker = L.marker(this.p2ll(c.coord), {
				title: this.i18n.layers.heropoint,
				icon: L.icon({
					iconUrl: images.heropoint,
					iconSize: [20, 20],
					iconAnchor: [10, 10],
					popupAnchor: [0, -10],
				})
			});

			var popup = '<img class="layer-contol-icon" src="' + images.heropoint + '" />'+ this.i18n.layers.heropoint+'<br/>'+c.coord.toString();

			// todo: layername workaround
			var layername = '<span class="layer-control" id="map' + this.id+ '-heropoint"></span>';

			marker.bindPopup(popup);
			this.layers[layername].addLayer(marker);
		});

		return this;
	}

	/**
	 * @param tasks
	 * @returns {GW2Map}
	 */
	drawTasks(tasks){

		Object.keys(tasks).forEach(taskID =>{
			var t = tasks[taskID];

			var marker = L.marker(this.p2ll(t.coord), {
				title: t.objective+' ('+t.level+')',
				icon: L.icon({
					iconUrl: images.task,
					iconSize: [24, 24],
					iconAnchor: [12, 12],
					popupAnchor: [0, -12],
				})
			});

			var popup = '<a href="' + this.i18n.wiki + encodeURIComponent(t.objective.replace(/\.$/, '')) + '" target="_blank">' + t.objective + '</a> (' + t.level + ')' +
			            '<br><input class="chatlink" type="text" value="' + t.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';

			// todo: layername workaround
			var layername = '<span class="layer-control" id="map' + this.id+ '-task"></span>';

			marker.bindPopup(popup);
			this.layers[layername].addLayer(marker);
		});

		return this;
	}

	/**
	 * @param poi
	 * @returns {GW2Map}
	 */
	drawPOI(poi){

		Object.keys(poi).forEach(poiID =>{
			var p = poi[poiID];

			var marker = L.marker(this.p2ll(p.coord), {
				title: p.name ? p.name : '',
				icon: L.icon({
					iconUrl: images[p.type],
					iconSize: [24, 24],
					iconAnchor: [12, 12],
					popupAnchor: [0, -12],
				})
			});

			var popup = '<img class="layer-contol-icon" src="' + images[p.type] + '" />';

			if(p.name){
				popup += '<a href="' + this.i18n.wiki + encodeURIComponent(p.name) + '" target="_blank">' + p.name + '</a>';
			}

			if(p.chat_link){
				popup += '<br><input class="chatlink" type="text" value="' + p.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';
			}

			// todo: layername workaround
			var layername = '<span class="layer-control" id="map' + this.id + '-' + p.type + '"></span>';

			marker.bindPopup(popup);
			this.layers[layername].addLayer(marker);
		});

		return this
	}

	/**
	 * @param change
	 * @returns {GW2Map}
	 */
	drawObjectives(change){

		if(change.type === 'add'){
			var objective = this.objectives[change.name];

			if(objective.coord){
				var icon;

				if(objective.marker){
					icon = objective.marker;
				}
				else if(in_array(objective.type, ['Camp', 'Castle', 'Keep', 'Tower'])){
					icon = images[objective.type];
				}
				else if(objective.type === 'Ruins'){
					// todo: https://github.com/arenanet/api-cdi/issues/328
//					console.log(objective);
				}

				if(icon){
					var marker = L.marker(this.p2ll(objective.coord), {
						title: objective.name,
						icon: L.icon({
							iconUrl: icon,
							iconSize: [32, 32],
							iconAnchor: [16, 16],
							popupAnchor: [0, -16],
						})
					});

					var popup = '<img class="layer-contol-icon" src="' + icon + '" />';

					if(objective.name){
						popup += '<a href="' + this.i18n.wiki + encodeURIComponent(objective.name) + '" target="_blank">' + objective.name + '</a>';
					}

					if(objective.chat_link){
						popup += '<br><input class="chatlink" type="text" value="' + objective.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';
					}

					// todo: layername workaround
					var layername = '<span class="layer-control" id="map' + this.id + '-' + objective.type + '"></span>';

					marker.bindPopup(popup);
					this.layers[layername].addLayer(marker);
				}

			}
		}

		return this;
	}

	/**
	 * @returns {GW2Map}
	 */
	getOptions(){
		var dataset = this.container.dataset;

		var continent_id = intval(dataset.continentId);
		var floor_id = intval(dataset.floorId);
		var region_id = intval(dataset.regionId);
		var map_id = intval(dataset.mapId);
		var zoom = intval(dataset.zoom);
		var lang = intval(dataset.language);

		continent_id = in_array(continent_id, [1, 2]) ? continent_id : 1;
		region_id = region_id > 0 ? region_id : false;
		map_id = map_id > 0 ? map_id : false;
		lang = ['de', 'en', 'es', 'fr', 'zh'][lang >= 0 && lang <= 4 ? lang : 1];

		// build the request path
		var path = '/continents/' + continent_id + '/floors/' + floor_id;
		path += region_id ? '/regions/' + region_id : '';
		path += region_id && map_id ? '/maps/' + map_id : '';
		path += '?lang=' + lang;

		this.i18n = i18n[lang];
		this.options = {
			continent_id: continent_id,
			floor_id    : floor_id,
			region_id   : region_id,
			map_id      : map_id,
			zoom        : zoom >= this.minZoom && zoom <= this.maxZoom ? zoom : this.maxZoom,
			lang        : lang,
			mapUrl      : this.apiBase + path,
			map_controls: dataset.mapControls != false,
			polylines   : dataset.polyline && dataset.polyline.length > 7 ? dataset.polyline : false,
			markers     : dataset.markers && dataset.markers.length > 2 ? dataset.markers : false,
		};

		return this;
	}

	/**
	 * @param coords
	 * @returns {LatLng}
	 */
	p2ll(coords){
		return this.map.unproject(coords, this.maxZoom);
	}

	/**
	 * @param point
	 * @param zoom
	 * @returns {*[]}
	 */
	project(point, zoom){
		var div = 1 << (this.maxZoom - zoom);

		return [point[0] / div, point[1] / div];
	}

	/**
	 * @param rect
	 * @returns {o.LatLngBounds}
	 */
	rect2bounds(rect){
		var nw = this.p2ll([rect[0][0], rect[1][1]]);
		var se = this.p2ll([rect[1][0], rect[0][1]]);

		return new L.LatLngBounds(nw, se);
	}

	/**
	 * @param coords
	 * @param zoom
	 * @returns {*}
	 */
	tileGetter(coords, zoom){
		var nw = this.project(this.viewRect[0], zoom);
		var se = this.project(this.viewRect[1], zoom);

		if(coords.x < Math.ceil(se[0] / 256) && coords.y < Math.ceil(se[1] / 256)
		   && coords.x >= Math.floor(nw[0] / 256) && coords.y >= Math.floor(nw[1] / 256)
		){
			return 'https://tiles.guildwars2.com/' +
			       this.options.continent_id + '/' + this.options.floor_id + '/' +
			       zoom + '/' + coords.x + '/' + coords.y + '.jpg';
		}

		return images.errortile;
	}

	/**
	 * @returns {GW2Map}
	 */
	setBaseMap(){

		// the map object
		this.map = L.map(this.container, {
			minZoom           : this.minZoom,
			maxZoom           : this.maxZoom,
			crs               : L.CRS.Simple,
			zoomControl       : this.options.map_controls,
			attributionControl: true,
		});

		// set the base tiles and add a little copyright info
		L.tileLayer(null, {
			minZoom               : this.minZoom,
			maxZoom               : this.maxZoom,
			continuousWorld       : true,
			attribution           : this.i18n.attribution + this.mapAttribution,
			zoomAnimationThreshold: 8,
			// use the custom tile getter
			tileGetter            : (coords, zoom) =>{
				return this.tileGetter(coords, zoom);
			}
		}).addTo(this.map);

		return this;
	}

	/**
	 * @returns {GW2Map}
	 */
	addMapControls(){

		Object.keys(zoomBreakpoints).forEach(type =>{
			// todo: HTML in layer names is a mess. WTF? https://twitter.com/codemasher/status/739585103395950592
			var layername = '<span class="layer-control" id="map' + this.id+ '-' +type + '"></span>';
			this.layers[layername] = L.layerGroup();
		});

		L.control.layers(null, this.layers).addTo(this.map);

		// todo: layername workaround
		this.addMapControlText();

		return this;
	}

	/**
	 * i hate it so much
	 * @returns {GW2Map}
	 */
	addMapControlText(){
		// todo: layername workaround
		// ugly workaround is ugly.
		Object.keys(zoomBreakpoints).forEach(type =>{
			var control = document.querySelector('#map'+this.id+'-'+type);

			// add layer icon
			if(in_array(type, [
					'landmark', 'skill', 'task', 'unlock', 'vista', 'waypoint',
					'Camp', 'Tower', 'Keep', 'Castle'
				])){

				var icon = document.createElement('img');
				icon.className = 'layer-contol-icon';
				icon.src = images[type];

				control.appendChild(icon);
			}

			// add layer description
			var textNode = document.createElement('span');
			textNode.className = 'layer-contol-label';
			textNode.innerText = this.i18n.layers[type];

			control.appendChild(textNode);
		});

		return this;
	}

	/**
	 * @param json
	 * @returns {GW2Map}
	 */
	setView(json){

		if(json.clamped_view){
			this.viewRect = json.clamped_view;
		}
		// todo: workaround https://gitter.im/arenanet/api-cdi?at=5754480da30177644b9982b7
		else if(this.options.continent_id === 2 && this.options.floor_id === 3 && this.options.region_id === 7){
			this.viewRect = [[5118, 6922], [16382, 16382]];
		}
		else if(json.continent_rect){
			this.viewRect = json.continent_rect;
		}
		else if(json.texture_dims){
			this.viewRect = [[0, 0], json.texture_dims];
		}

		// set bounds and view
		var bounds = this.rect2bounds(this.viewRect).pad(0.1);

		this.map.setMaxBounds(bounds);

		// todo: center coords
		this.map.setView(bounds.getCenter(), this.options.zoom);

		return this;
	}

	/**
	 * @returns {GW2Map}
	 */
	toggleLayers(){

		Object.keys(zoomBreakpoints).forEach(type =>{
			// todo: layername workaround
			var layername = '<span class="layer-control" id="map' + this.id+ '-' +type + '"></span>';

			if(this.layers[layername]){
				this.map.getZoom() > zoomBreakpoints[type]
					? this.layers[layername].addTo(this.map)
					: this.map.removeLayer(this.layers[layername])

			}
		});

		// todo: layername workaround
		this.addMapControlText();

		return this;
	}
}

var zoomBreakpoints = {
	waypoint  : 3,
	task      : 4,
	landmark  : 4,
	heropoint : 4,
	vista     : 4,
	unlock    : 3,
	sector    : 5,
	map       : 2,
	region    : 1,
	markers   : 3,
	polylines : 4,
	Camp      : 5,
	Tower     : 5,
	Keep      : 5,
	Castle    : 5,
	Ruins     : 5,
	Generic   : 5,
	Resource  : 5,
};

var images = {
	task          : 'https://render.guildwars2.com/file/09ACBA53B7412CC3C76E7FEF39929843C20CB0E4/102440.png',
	task_hover    : 'https://render.guildwars2.com/file/B3DEEC72BBEF0C6FC6FEF835A0E275FCB1151BB7/102439.png',
	landmark      : 'https://render.guildwars2.com/file/25B230711176AB5728E86F5FC5F0BFAE48B32F6E/97461.png',
	waypoint      : 'https://render.guildwars2.com/file/32633AF8ADEA696A1EF56D3AE32D617B10D3AC57/157353.png',
	waypoint_hover: 'https://render.guildwars2.com/file/95CE3F6B0502232AD90034E4B7CE6E5B0FD3CC5F/157354.png',
	unlock        : 'https://render.guildwars2.com/file/943538394A94A491C8632FBEF6203C2013443555/102478.png', // dungeon icon
	vista         : 'https://render.guildwars2.com/file/A2C16AF497BA3A0903A0499FFBAF531477566F10/358415.png',
	heropoint     : 'https://render.guildwars2.com/file/B4EC6BB3FDBC42557C3CAE0CAA9E57EBF9E462E3/156626.png',
	Camp          : 'https://render.guildwars2.com/file/015D365A08AAE105287A100AAE04529FDAE14155/102532.png',
	Tower         : 'https://render.guildwars2.com/file/ABEC80C79576A103EA33EC66FCB99B77291A2F0D/102531.png',
	Keep          : 'https://render.guildwars2.com/file/DB580419C8AD9449309A96C8E7C3D61631020EBB/102535.png',
	Castle        : 'https://render.guildwars2.com/file/F0F1DA1C807444F4DF53090343F43BED02E50523/102608.png',
	errortile     : 'blank.png'
};

/**
 * TODO: add es & fr language snippets
 */
var i18n = {
	de: {
		wiki       : 'https://wiki-de.guildwars2.com/wiki/',
		attribution: 'Kartendaten und -bilder',
		layers     : {
			event     : 'Events',
			landmark  : 'Sehenswürdigkeiten',
			map       : 'Kartennamen',
			markers   : 'Marker',
			polylines : 'Polylinien',
			region    : 'Regionen',
			sector    : 'Zonen',
			heropoint : 'Fertigkeitspunkte',
			task      : 'Aufgaben',
			unlock    : 'unlock',
			vista     : 'Aussichtspunkte',
			waypoint  : 'Wegpunkte',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	en: {
		wiki       : 'https://wiki.guildwars2.com/wiki/',
		attribution: 'Map data and imagery',
		layers     : {
			// test
			event     : 'Events',
			landmark  : 'Landmarks',
			map       : 'Map Names',
			markers   : 'Markers',
			polylines : 'Polylines',
			region    : 'Region Names',
			sector    : 'Sectors',
			heropoint : 'Skill Challenges',
			task      : 'Tasks',
			unlock    : 'unlock',
			vista     : 'Vistas',
			waypoint  : 'Waypoints',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	es: {
		wiki       : 'https://wiki-es.guildwars2.com/wiki/',
		attribution: 'attribution-es',
		layers     : {
			event     : 'event-es',
			landmark  : 'poi-es',
			map       : 'map-es',
			markers   : 'markers-es',
			polylines : 'polyline-es',
			region    : 'region-es',
			sector    : 'sector-es',
			heropoint : 'skill-es',
			task      : 'task-es',
			unlock    : 'unlock',
			vista     : 'vista-es',
			waypoint  : 'waypoint-es',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	fr: {
		wiki       : 'https://wiki-fr.guildwars2.com/wiki/',
		attribution: 'attribution-fr',
		layers     : {
			event     : 'event-fr',
			landmark  : 'Sites remarquables',
			map       : 'map-fr',
			markers   : 'markers-fr',
			polylines : 'polyline-fr',
			region    : 'region-fr',
			sector    : 'Secteurs',
			heropoint : 'Défis de compétences',
			unlock    : 'unlock',
			task      : 'Cœurs',
			vista     : 'Panoramas',
			waypoint  : 'Points de passage',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	zh: {
		wiki       : '',
		attribution: 'attribution-zh',
		layers     : {
			event     : 'event-zh',
			landmark  : 'poi-zh',
			map       : 'map-zh',
			markers   : 'markers-zh',
			polylines : 'polyline-zh',
			region    : 'region-zh',
			sector    : 'sector-zh',
			heropoint : 'skill-zh',
			task      : 'task-zh',
			unlock    : 'unlock',
			vista     : 'vista-zh',
			waypoint  : 'waypoint-zh',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
};

// http://phpjs.org/functions/intval/
function intval(mixed_var, base){
	var tmp;
	var type = typeof(mixed_var);

	if(type === 'boolean'){
		return +mixed_var;
	}
	else if(type === 'string'){
		tmp = parseInt(mixed_var, base || 10);
		return (isNaN(tmp) || !isFinite(tmp)) ? 0 : tmp;
	}
	else if(type === 'number' && isFinite(mixed_var)){
		return mixed_var|0;
	}
	else{
		return 0;
	}
}

// http://phpjs.org/functions/in_array/
function in_array(needle, haystack, argStrict){
	var key = '';
	var strict = !!argStrict;

	if(strict){
		for(key in haystack){
			if(haystack.hasOwnProperty(key)){
				if(haystack[key] === needle){
					return true;
				}
			}
		}
	}
	else{
		for(key in haystack){
			if(haystack.hasOwnProperty(key)){
				if(haystack[key] == needle){
					return true;
				}
			}
		}
	}

	return false;
}

