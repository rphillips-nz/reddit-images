angular.module('main', ['ngResource'])

.factory('Reddit', ['$resource', function($resource) {
	return $resource(
		'http://www.reddit.com/r/:subreddit/hot.json',
		{subreddit: '@subreddit'},
		{get: {method: 'JSONP', params: {jsonp: 'JSON_CALLBACK'}}}
	);
}])

.controller('MainCtrl', ['$scope', 'Reddit', function($scope, Reddit) {

	$scope.items = [];

	function search(subreddit) {
		Reddit.get({subreddit: subreddit.name}, function onSuccess(result) {
			_.each(result.data.children, function(item) {
				item.subredditName = subreddit.name;

				if (_.contains(['i.imgur.com', 'imgur.com'], item.data.domain)) {
					item.listing_type = 'image';

					if (/\/a\//i.test(item.data.url)) {
						item.listing_type = 'image-album';
					} else if (!/jpg|png|gif|jpeg/i.test(item.data.url)) {
						item.data.url = item.data.url + '.png';
					}
				} else {
					item.listing_type = 'post';
				}
			});

			$scope.items = $scope.items.concat(result.data.children);
		});
	}

	$scope.subreddits = [
		{name: 'fixedgearbicycle', selected: true, searching: false},
		{name: 'gaming', selected: false, searching: false},
		{name: 'webdev', selected: true, searching: false},
		{name: 'technology', selected: false, searching: false},
		{name: 'pictures', selected: false, searching: false},
		{name: 'cats', selected: false, searching: false}
	];

	function searchSelected() {
		_.each(selectedSubreddits(), function(subreddit) {
			if (subreddit.selected && !subreddit.searching) {
				subreddit.searching = true;
				search(subreddit);
			}
		});
	}

	function selectedSubreddits() { return _.where($scope.subreddits, {selected: true}); };

	$scope.toggle = function(subreddit) { subreddit.selected = !subreddit.selected; searchSelected(); };
	$scope.isSelected = function(subredditName) {
		return _.where($scope.subreddits, {selected: true, name: subredditName}).length > 0;
	};

	$scope.contains = function(list, value) { return _.contains(list, value); };

	searchSelected();

}]);
