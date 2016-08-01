import api from "shared/api/monster";
import {Monster} from "shared/types";
import {parseAs} from "shared/parsers";
import state from "frontend/state";
import ajax from "frontend/ajax";

let dataCursor = state.select(api.plural);
let itemsCursor = dataCursor.select("items");

// Object -> Promise Monster
export default function editItem(data) {
  console.debug(api.plural + `.editItem(${data.id})`);

  let item = parseAs(Monster, data);
  let id = item.id;

  // Optimistic update
  let oldItem = itemsCursor.get(id);
  itemsCursor.set(id, item);

  return ajax.put(api.itemUrl.replace(":id", id), item)
    .then(response => {
      if (response.status.startsWith("2")) {
        if (response.status == "200" && response.data.data) {
          item = itemsCursor.set(id, parseAs(Monster, response.data.data));
        }
        return item;
      } else {
        itemsCursor.set(id, oldItem);
        throw Error(response.statusText);
      }
    });
}
