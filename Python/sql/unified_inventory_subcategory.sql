-- ============================================================
-- Unified Inventory — SUB CATEGORY BACKFILL
-- Purpose : Make Master_SubCategory the actual source of the
--           sub-categories the Item master offers.
--
--           The Item master's dropdown unions the sub-category
--           master with values already present on item records.
--           The master was empty, so every sub-category on screen
--           (Syringes, Gloves, IV Sets, ...) came from the items
--           themselves - typed once, never registered anywhere.
--           That means a sub-category could not be renamed,
--           deactivated or reused on a new item until some item
--           already carried it.
--
--           This registers each (Category, SubCategory) pair that
--           items are already using, so the master matches reality
--           and becomes the place they are maintained.
--
-- Safety  : ADDITIVE + IDEMPOTENT. Only pairs that are genuinely
--           in use are inserted, and only when not already present.
--           No item row is modified; nothing is deleted.
-- ============================================================

SET @uim_next_sub := (
    SELECT COALESCE(MAX(CAST(SUBSTRING(SubCategoryCode, 5) AS UNSIGNED)), 0)
      FROM admin.Master_SubCategory
);

INSERT INTO admin.Master_SubCategory
       (SubCategoryCode, Category, SubCategoryName, Description, Status, CreatedBy)
SELECT CONCAT('SUB-', LPAD(@uim_next_sub := @uim_next_sub + 1, 3, '0')),
       src.Category,
       src.SubCategory,
       'Registered from items already using this sub-category',
       'Active',
       'UIM-SubCat'
  FROM (
        SELECT DISTINCT i.Category, i.SubCategory
          FROM admin.Master_Item i
         WHERE i.IsDeleted = 0
           AND i.SubCategory IS NOT NULL AND i.SubCategory <> ''
           AND i.Category    IS NOT NULL AND i.Category    <> ''
       ) src
 WHERE NOT EXISTS (
        SELECT 1 FROM admin.Master_SubCategory sc
         WHERE sc.IsDeleted = 0
           AND LOWER(sc.Category)        = LOWER(src.Category)
           AND LOWER(sc.SubCategoryName) = LOWER(src.SubCategory)
       );
