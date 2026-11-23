# Rook Vale · The Wick Aviator

An original, unlockable bonus pilot for the optional Lantern Ford chase. Recover the
shrine's **stolen** light with a living, manually controlled hero; merely defending the
shrine or losing the chase does not unlock Rook. The local study save remembers it.
Play from the results screen or the title page. Normal matches retain the original
roster and do not offer the bonus pilot or supply shelf.

- **E / Lantern Lift** gives 1.02 seconds of steerable lift and a gravity-driven descent.
  Aim and fire during the rise, bank with movement, and land before the next lift.
  The altitude cap and the cooldown prevent continuous flight.
- The **lantern pack** starts at 72 integrity, separate from health. Each unreinforced
  lift wears off 26 points. Contact with a fleeing Hush carrier scuffs it every 1.1 s
  at most; incoming damage also wears the pack. Below 17 integrity the lift cannot fire.
- Align over an existing **thread** while moving in its direction. The thread catches
  the pilot once per lift, adding 0.27 s and refunding 8 integrity. The flight line is
  drawn from actual lane coordinates, not a painted guide.
- **Gum** (+38 integrity), **Mastic** (+14 integrity and one +0.32 s, lighter-wear lift),
  and **Doublemint** (+11 integrity, resets lift cooldown, six seconds of speed) are
  pickups along the Ford. They can also be bought with souls at the **Shhhop** (B).
  Use the Shhhop before the thief gets away; it does not freeze the simulation.
  Doublemint is a working label, subject to name/brand clearance before any sale.
- **Q / Wick Skip** sends a visible stitch projectile. **F / Landing Bell** produces a
  close-range pulse. The original four heroes' controls and kits are unchanged.

## Original visual direction

The reference search was for period silhouette and readable direction during flight:
[Disney's 1991 feature](https://movies.disney.com/the-rocketeer),
[Disney's contemporary exhibit record](https://d23.com/a-to-z/rocketeer-gallery/),
and [an original theatrical poster](https://propstoreauction.com/lot-details/index/catalog/398/lot/141320/328-Subway-Poster-46-x-60-Signed-by-Creator-Dave-Stevens-Very-Fine-Rolled-THE-ROCKETEER-1991).
No film images, logos, costumes, names, music or footage are included.
The turnaround was drawn as a source SVG for Livloch: cobalt courier wool, a
pale ceramic hood and mint kite scarf, and a faceted wick lantern held between wood
fins. No brass fin helmet or production likeness. This is original homage direction,
not a legal opinion on commercial clearance.

## Verification

`node --test tools/ford-flyer-test.js` exercises isolated unlock policy, unchanged
normal roster, lift/steering/recovery, pack damage, thread catch, one-shot pickup,
and shop charging/effects. `node --test tools/ford-test.js` exercises theft, victory
and replay. Real user feel, hardware performance, controller/touch and WebGL visuals
require playtesting; tests are simulator evidence, not human play.
