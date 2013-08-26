/*
    This file is part of Caddisfly

    Caddisfly is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Caddisfly is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Caddisfly.  If not, see <http://www.gnu.org/licenses/>.
*/

var getColor = function (value, type) {
    switch (type) {
        case 1:
            return value > 1.5 ? 'rgb(211, 51, 51)' : value < 1 ? 'green' : 'orange';
        case 2:
            return value > 45 ? 'rgb(211, 51, 51)' : value < 35 ? 'green' : 'orange';
        case 3:
            return value > 5 ? 'rgb(211, 51, 51)' : value < 6 ? 'green' : 'orange';
        case 4:
            return value > 0.05 ? 'rgb(211, 51, 51)' : value < 0.04 ? 'green' : 'orange';
        case 5:
            return value > 1.0 ? 'rgb(211, 51, 51)' : value < 0.9 ? 'green' : 'orange';
        default:
            return value > 1.5 ? 'rgb(211, 51, 51)' : value < 1 ? 'green' : 'orange';
    }
}
