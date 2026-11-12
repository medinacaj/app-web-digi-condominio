/** Approved base tariff. Quotes do not charge, include taxes or apply unapproved discounts. */
import {Problem} from './store.js';
export function monthlyPrice(unitCount){
 if(!Number.isSafeInteger(unitCount)||unitCount<0||!Number.isSafeInteger(unitCount*75))throw new Problem(400,'Cantidad de unidades inválida');
 return Math.max(2500,unitCount*75);
}
export function quoteAccount(store,actorId,accountId){
 store.requireAccountAdmin(actorId,accountId);
 const communities=store.db.prepare('SELECT c.id,c.name,COUNT(u.id) unitCount FROM communities c LEFT JOIN units u ON u.community_id=c.id WHERE c.account_id=? GROUP BY c.id ORDER BY c.name,c.id').all(accountId).map(row=>({...row,amountMinor:monthlyPrice(row.unitCount)}));
 const amountMinor=communities.reduce((sum,c)=>sum+c.amountMinor,0);
 if(!Number.isSafeInteger(amountMinor))throw new Problem(400,'Importe fuera de rango');
 return {currency:'USD',period:'month',unitPriceMinor:75,minimumPerCommunityMinor:2500,communities,amountMinor,taxIncluded:false,taxStatus:'pending',discountMinor:0,billingEnabled:false};
}
